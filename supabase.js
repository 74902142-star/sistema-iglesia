/* ============================================================
   supabase.js — Capa de datos del sistema Iglesia Agua Viva
   Migración: Firestore (límite 50k lecturas/día) → Supabase
   API REST vía PostgREST. Sin SDK, funciona en GitHub Pages.

   Expone:
     SB.*              → API fila a fila (select/insert/update/delete)
     sb.collection(t)  → shim compatible con el SDK de Firestore
     db.collection(t)  → alias de sb.collection (compatibilidad)
     firestoreGet / firestoreAdd / firestoreUpdateDoc /
     firestoreDeleteDoc       → wrappers con la misma
                         firma que el código antiguo
   ============================================================ */
(function () {
    'use strict';

    var SB_URL = 'https://bhuxtunecrqybnlmdspy.supabase.co';
    var SB_KEY = 'sb_publishable_O2I6gdmeKFfxE5J6KO5kcA_2-sADXLy';
    var PAGE_SIZE = 1000;   // PostgREST: tope por petición
    var TIMEOUT = 20000;

    function baseHeaders(extra) {
        var h = {
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json'
        };
        if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
        return h;
    }

    function fetchTimeout(url, opts, ms) {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, ms || TIMEOUT);
        opts = opts || {};
        opts.signal = ctrl.signal;
        return fetch(url, opts).finally(function () { clearTimeout(timer); });
    }

    async function request(path, opts, attempt) {
        attempt = attempt || 0;
        opts = opts || {};
        opts.headers = Object.assign(baseHeaders(), opts.headers || {});
        var resp;
        try {
            resp = await fetchTimeout(SB_URL + path, opts, TIMEOUT);
        } catch (e) {
            // Error de red real (no timeout): reintentar hasta 2 veces
            if (attempt < 2 && e.name === 'TypeError') {
                console.warn('SB reintento ' + (attempt + 1) + ' ' + path + ' -> ' + e.message);
                await new Promise(function (r) { setTimeout(r, 400 * (attempt + 1)); });
                return request(path, opts, attempt + 1);
            }
            throw e;
        }
        var text = '';
        try { text = await resp.text(); } catch (e) { }
        if (!resp.ok) {
            var msg = 'HTTP ' + resp.status;
            try {
                var body = JSON.parse(text);
                if (body.message) msg = body.message;
            } catch (e) { }
            var err = new Error(msg);
            err.status = resp.status;
            // Reintentar solo fallos transitorios del servidor (5xx)
            if (resp.status >= 500 && attempt < 2) {
                await new Promise(function (r) { setTimeout(r, 400 * (attempt + 1)); });
                return request(path, opts, attempt + 1);
            }
            throw err;
        }
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    function encValue(v) {
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return encodeURIComponent(String(v));
    }

    function filterParam(field, op, value) {
        var ops = { '==': 'eq', '!=': 'neq', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte', 'in': 'in' };
        var o = ops[op] || 'eq';
        if (op === 'in' && Array.isArray(value)) value = '(' + value.join(',') + ')';
        return encodeURIComponent(field) + '=' + o + '.' + encValue(value);
    }

    function newId() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var out = '';
        var buf = null;
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            buf = crypto.getRandomValues(new Uint8Array(20));
        }
        for (var i = 0; i < 20; i++) {
            var r = buf ? buf[i] : Math.floor(Math.random() * 256);
            out += chars[r % chars.length];
        }
        return out;
    }

    function cleanRow(data) {
        var row = {};
        Object.keys(data).forEach(function (k) {
            if (k === '_path') return;
            if (data[k] === undefined) return;
            row[k] = data[k];
        });
        return row;
    }

    // Columnas reales de cada tabla (debe coincidir con supabase-schema.sql).
    // Evita que un campo nuevo en un formulario rompa el guardado.
    var TABLE_COLUMNS = {
        registros: ['id', 'fecha', 'sede', 'semana', 'mes', 'totalGeneral', 'totalVarones', 'totalMujeres', 'totalKV', 'totalKM', 'registradoPor', 'origen', 'creadoEn', 'asistentes', 'ministerios'],
        inscripciones: ['id', 'celular', 'nombres', 'metodoPago', 'pagoCaptura', 'dni', 'timestamp', 'docTipo', 'cursoId', 'correo', 'creadoPor', 'origen', 'cursoNombre', 'estadoPago', 'fechaHorario', 'sede', 'lider', 'monto', 'ciclo'],
        kids_maestros: ['id', 'lider', 'nombres', 'sexo', 'dni', 'createdAt', 'origen', 'celular'],
        kids_asistencia: ['id', 'fecha', 'timestamp', 'hora', 'maestroId', 'origen'],
        lideres_maestros: ['id', 'lider', 'nombres', 'sexo', 'dni', 'createdAt', 'origen', 'celular'],
        lideres_asistencia: ['id', 'fecha', 'timestamp', 'hora', 'maestroId', 'origen'],
        participantes: ['id', 'nombre', 'telefono', 'sede', 'rol', 'fecha', 'tipoServicio', 'hora', 'enviado', 'recordatorioEnviado', 'foto'],
        creativos: ['id', 'nombre', 'telefono', 'rol', 'servicio', 'fecha', 'hora', 'timestamp'],
        personas: ['id', 'nombre', 'telefono', 'nombres', 'dni', 'celular', 'correo', 'origen', 'createdAt']
    };

    function onlyKnownColumns(table, row) {
        var cols = TABLE_COLUMNS[table];
        if (!cols) return row;
        var out = {}, dropped = [];
        Object.keys(row).forEach(function (k) {
            if (cols.indexOf(k) !== -1) out[k] = row[k];
            else dropped.push(k);
        });
        if (dropped.length) console.warn('Supabase: campos ignorados en "' + table + '": ' + dropped.join(', '));
        return out;
    }

    /* ---------- API de filas ---------- */

    async function selectPage(table, params) {
        params = params || {};
        var qs = [];
        (params.filters || []).forEach(function (f) {
            qs.push(filterParam(f.field, f.op, f.value));
        });
        if (params.order) {
            qs.push('order=' + encodeURIComponent(params.order.field) + '.' +
                (params.order.dir === 'desc' ? 'desc' : 'asc'));
        }
        qs.push('limit=' + (params.limit || PAGE_SIZE));
        if (params.offset) qs.push('offset=' + params.offset);
        return await request('/rest/v1/' + encodeURIComponent(table) + (qs.length ? '?' + qs.join('&') : ''));
    }

    async function select(table, params) {
        var all = [];
        var offset = (params && params.offset) || 0;
        while (true) {
            var page = await selectPage(table, Object.assign({}, params, { offset: offset, limit: PAGE_SIZE }));
            if (!Array.isArray(page)) break;
            all = all.concat(page);
            if (page.length < PAGE_SIZE) break;
            offset += page.length;
            if (offset > 50000) break;
        }
        return all;
    }

    async function insert(table, data) {
        var row = onlyKnownColumns(table, cleanRow(data));
        if (!row.id) row.id = newId();
        var out = await request('/rest/v1/' + encodeURIComponent(table), {
            method: 'POST',
            headers: baseHeaders({ 'Prefer': 'return=representation' }),
            body: JSON.stringify(row)
        });
        if (Array.isArray(out) && out.length) return out[0];
        return row;
    }

    async function update(table, id, data) {
        var row = onlyKnownColumns(table, cleanRow(data));
        delete row.id;
        var out = await request('/rest/v1/' + encodeURIComponent(table) + '?id=eq.' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: baseHeaders({ 'Prefer': 'return=representation' }),
            body: JSON.stringify(row)
        });
        if (Array.isArray(out) && out.length) return out[0];
        return Object.assign({ id: id }, row);
    }

    async function remove(table, id) {
        await request('/rest/v1/' + encodeURIComponent(table) + '?id=eq.' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: baseHeaders()
        });
    }

    async function get(table, id) {
        var out = await select(table, { filters: [{ field: 'id', op: '==', value: id }], limit: 1 });
        return (Array.isArray(out) && out.length) ? out[0] : null;
    }

    /* ---------- Wrappers con firma Firestore ---------- */

    async function firestoreGetREST(collection) {
        var rows = await select(collection);
        // Compatibilidad: el dashboard usa `firebaseId`, el resto usa `id`
        return rows.map(function (r) {
            var row = Object.assign({}, r);
            row.firebaseId = r.id;
            return row;
        });
    }

    async function firestoreGet(collection, docId) {
        if (docId) return await firestoreGetDoc(collection, docId);
        return await select(collection);
    }

    async function firestoreGetDoc(collection, docId) {
        var row = await get(collection, docId);
        if (!row) return { id: docId, firebaseId: docId };
        row.firebaseId = row.id;
        return row;
    }

    async function firestoreAddREST(collection, data) {
        var row = await insert(collection, data);
        return { name: SB_URL + '/rest/v1/' + collection + '/' + row.id, id: row.id };
    }

    async function firestoreAdd(collection, data) {
        return await firestoreAddREST(collection, data);
    }

    async function firestoreUpdateDoc(collection, docId, data) {
        return await update(collection, docId, data);
    }

    async function firestoreDeleteDoc(collection, docId) {
        await remove(collection, docId);
    }

    /* ---------- Shim compatible con el SDK de Firestore ---------- */

    function makeSnapshot(rows, table) {
        var docs = rows.map(function (r) {
            var data = Object.assign({}, r);
            delete data.id;
            return {
                id: r.id,
                data: function () { return data; },
                exists: true,
                ref: {
                    id: r.id,
                    delete: function () { return remove(table, r.id); },
                    update: function (d) { return update(table, r.id, d); },
                    set: function (d) { return update(table, r.id, d); }
                }
            };
        });
        return {
            docs: docs,
            size: docs.length,
            empty: docs.length === 0,
            forEach: function (cb) { docs.forEach(cb); }
        };
    }

    function Query(table, filters, order) {
        this._table = table;
        this._filters = filters || [];
        this._order = order || null;
    }

    Query.prototype.where = function (field, op, value) {
        this._filters.push({ field: field, op: op, value: value });
        return this;
    };

    Query.prototype.orderBy = function (field, dir) {
        this._order = { field: field, dir: dir };
        return this;
    };

    Query.prototype.limit = function (n) {
        this._limit = n;
        return this;
    };

    Query.prototype.get = async function () {
        var rows = await select(this._table, {
            filters: this._filters,
            order: this._order
        });
        if (this._limit) rows = rows.slice(0, this._limit);
        return makeSnapshot(rows, this._table);
    };

    function collection(table) {
        return {
            _table: table,
            where: function (field, op, value) { return new Query(table, [{ field: field, op: op, value: value }]); },
            orderBy: function (field, dir) { return new Query(table, [], { field: field, dir: dir }); },
            get: async function () { return makeSnapshot(await select(table), table); },
            add: async function (data) {
                var row = await insert(table, data);
                return { id: row.id, _table: table };
            },
            doc: function (id) {
                return {
                    id: id,
                    _table: table,
                    get: async function () {
                        var row = await get(table, id);
                        if (!row) return { id: id, exists: false, data: function () { return null; } };
                        var data = Object.assign({}, row);
                        delete data.id;
                        return { id: id, exists: true, data: function () { return data; } };
                    },
                    set: async function (data) {
                        var payload = onlyKnownColumns(table, cleanRow(data));
                        payload.id = id;
                        await request('/rest/v1/' + encodeURIComponent(table) + '?on_conflict=id', {
                            method: 'POST',
                            headers: baseHeaders({ 'Prefer': 'resolution=merge-duplicates' }),
                            body: JSON.stringify(payload)
                        });
                    },
                    update: async function (data) { return await update(table, id, data); },
                    delete: async function () { await remove(table, id); }
                };
            },
            onSnapshot: function () { console.warn('onSnapshot no soportado en Supabase'); return function () { }; }
        };
    }

    /* ---------- Exports globales ---------- */

    window.SB = {
        url: SB_URL,
        key: SB_KEY,
        newId: newId,
        select: select,
        insert: insert,
        update: update,
        remove: remove,
        get: get,
        request: request
    };

    window.sb = { collection: collection };
    window.db = { collection: collection };   // alias: `db.collection(...)` sigue funcionando

    window.firestoreGetREST = firestoreGetREST;
    window.firestoreGet = firestoreGet;
    window.firestoreGetDoc = firestoreGetDoc;
    window.firestoreAdd = firestoreAdd;
    window.firestoreAddREST = firestoreAddREST;
    window.firestoreUpdateDoc = firestoreUpdateDoc;
    window.firestoreDeleteDoc = firestoreDeleteDoc;

    // Compatibilidad con el código que esperaba Firebase
    window.firebaseReady = Promise.resolve();
    window.firebaseConfig = {
        projectId: 'iglesia-agua-viva',
        apiKey: '(migrado-a-supabase)'
    };

    console.log('✅ Supabase conectado (' + SB_URL.replace('https://', '') + ')');
})();
