/**
 * OilManager — Texas GLO Land Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides live Texas General Land Office data via ArcGIS FeatureServer REST:
 *
 *   • Active Oil & Gas Leases      — polygon, statewide TX
 *   • Inactive Oil & Gas Leases    — expired/terminated leases
 *   • Active O&G Units             — pooled drilling unit polygons
 *   • Inactive O&G Units           — expired units
 *   • Lease Sale Nominated Tracts  — tracts up for next lease sale
 *   • Permanent School Fund        — PSF land polygons (~13M acres across TX)
 *
 * All services confirmed live as of 2026-06-26:
 *   https://services1.arcgis.com/YWG34dhJxrbxQWdF/arcgis/rest/services/
 *
 * Usage: GLOService.fetchLeases(bbox) → GeoJSON FeatureCollection
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GLOService = (() => {

  const BASE = 'https://services1.arcgis.com/YWG34dhJxrbxQWdF/arcgis/rest/services';

  const ENDPOINTS = {
    leases         : `${BASE}/Oil_and_Gas_Leases_Active/FeatureServer/0`,
    leasesInactive : `${BASE}/Oil_and_Gas_Leases_In_Active/FeatureServer/0`,
    units          : `${BASE}/Oil_and_Gas_Units_Active/FeatureServer/0`,
    unitsInactive  : `${BASE}/Oil_and_Gas_Units_In_Active/FeatureServer/0`,
    nominated      : `${BASE}/Oil_and_Gas_Lease_Sale_Nominated_Tracts_(Public)/FeatureServer/0`,
    psf            : `${BASE}/Permanent_School_Fund_Lands/FeatureServer/0`,
  };

  // ── Cache ──────────────────────────────────────────────────────────────────
  const _cache = new Map();
  const CACHE_TTL = 8 * 60 * 1000; // 8 min — GLO data changes infrequently

  function _cacheKey(type, bbox) {
    return `${type}:${bbox.map(v => Math.round(v * 100) / 100).join(',')}`;
  }
  function _getCached(k) {
    const e = _cache.get(k);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
    return e.data;
  }
  function _setCache(k, data) {
    if (_cache.size > 60) _cache.delete(_cache.keys().next().value);
    _cache.set(k, { ts: Date.now(), data });
  }

  // ── Generic fetch with 15s timeout ────────────────────────────────────────
  async function _fetch(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || 'GLO service error');
      return json;
    } catch(e) {
      clearTimeout(t);
      if (e.name === 'AbortError') throw new Error('GLO request timed out');
      throw e;
    }
  }

  // ── Build query URL ────────────────────────────────────────────────────────
  function _buildUrl(endpoint, bbox, outFields, maxRecords = 200, extraWhere = '') {
    const [west, south, east, north] = bbox;
    const where = extraWhere || '1=1';
    const params = new URLSearchParams({
      where,
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: outFields.join(','),
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
      resultRecordCount: String(maxRecords),
    });
    return `${endpoint}/query?${params.toString()}`;
  }

  // ── Public fetch functions ─────────────────────────────────────────────────

  async function fetchLeases(bbox) {
    const k = _cacheKey('leases', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.leases, bbox, [
      'LEASE_NUMBER','LEASE_STATUS','EFFECTIVE_DATE','PRIMARY_TERM_END_DATE',
      'ORIGINAL_LESSEE','LESSOR','FIELD_NAME','LAND_TYPE',
      'CURRENT_GROSS_ACRES','LEASE_TYPE','COUNTY',
      'LEASE_ROYALTY_OIL','LEASE_ROYALTY_GAS','DEPTH_FROM','DEPTH_TO',
    ], 300);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  async function fetchUnits(bbox) {
    const k = _cacheKey('units', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.units, bbox, [
      'UNIT_NAME','UNIT_STATUS','EFFECTIVE_DATE','FIELD_NAME','COUNTY','OBJECTID',
    ], 150);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  async function fetchLeasesInactive(bbox) {
    const k = _cacheKey('leasesInactive', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.leasesInactive, bbox, [
      'LEASE_NUMBER','LEASE_STATUS','LEASE_STATUS_DATE','EFFECTIVE_DATE',
      'PRIMARY_TERM_END_DATE','ORIGINAL_LESSEE','LESSOR','FIELD_NAME',
      'CURRENT_GROSS_ACRES','LEASE_TYPE','DEPTH_FROM','DEPTH_TO',
    ], 300);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  async function fetchUnitsInactive(bbox) {
    const k = _cacheKey('unitsInactive', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.unitsInactive, bbox, [
      'UNIT_NAME','UNIT_STATUS','EFFECTIVE_DATE','FIELD_NAME','COUNTY','OBJECTID',
    ], 150);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  async function fetchNominated(bbox) {
    const k = _cacheKey('nominated', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.nominated, bbox, [
      'TRACT_NUMBER','COUNTY','ACRES','LAND_TYPE','SURVEY','BLOCK','OBJECTID',
    ], 200);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  async function fetchPSF(bbox) {
    const k = _cacheKey('psf', bbox);
    const c = _getCached(k);
    if (c) return c;
    const url = _buildUrl(ENDPOINTS.psf, bbox, [
      'COUNTY','LAND_TYPE','ORIGINAL_ACRES','CURRENT_ACRES','SURVEY','BLOCK','OBJECTID',
    ], 200);
    const data = await _fetch(url);
    _setCache(k, data);
    return data;
  }

  // ── Label formatters ───────────────────────────────────────────────────────

  function formatLeaseLabel(props) {
    const p = props || {};
    return {
      title   : `Lease ${p.LEASE_NUMBER || '—'}`,
      lessee  : p.ORIGINAL_LESSEE || 'Unknown Lessee',
      lessor  : p.LESSOR || '',
      field   : p.FIELD_NAME || 'No Field Name',
      acres   : p.CURRENT_GROSS_ACRES ? `${Number(p.CURRENT_GROSS_ACRES).toLocaleString()} ac` : '—',
      type    : p.LEASE_TYPE || '',
      county  : p.COUNTY || '',
      royalty : p.LEASE_ROYALTY_OIL ? `${p.LEASE_ROYALTY_OIL}% oil / ${p.LEASE_ROYALTY_GAS || '—'}% gas` : '—',
      status  : p.LEASE_STATUS || 'Active',
      depth   : p.DEPTH_FROM && p.DEPTH_TO ? `${p.DEPTH_FROM}–${p.DEPTH_TO} ft` : 'All Depths',
    };
  }

  function formatUnitLabel(props) {
    const p = props || {};
    return {
      title  : p.UNIT_NAME || 'O&G Unit',
      field  : p.FIELD_NAME || '',
      county : p.COUNTY || '',
      status : p.UNIT_STATUS || 'Active',
    };
  }

  function formatPSFLabel(props) {
    const p = props || {};
    return {
      title  : `PSF Land — ${p.COUNTY || ''} Co.`,
      survey : p.SURVEY ? `Survey: ${p.SURVEY}` : '',
      block  : p.BLOCK  ? `Block: ${p.BLOCK}`   : '',
      acres  : p.CURRENT_ACRES ? `${Number(p.CURRENT_ACRES).toLocaleString()} ac` : '—',
      type   : p.LAND_TYPE || '',
    };
  }

  function formatInactiveLeaseLabel(props) {
    const p = props || {};
    return {
      title   : `Lease ${p.LEASE_NUMBER || '—'} (Inactive)`,
      lessee  : p.ORIGINAL_LESSEE || 'Unknown Lessee',
      field   : p.FIELD_NAME || 'No Field Name',
      acres   : p.CURRENT_GROSS_ACRES ? `${Number(p.CURRENT_GROSS_ACRES).toLocaleString()} ac` : '—',
      status  : p.LEASE_STATUS || 'Inactive',
      ended   : p.LEASE_STATUS_DATE || p.PRIMARY_TERM_END_DATE || '—',
      depth   : p.DEPTH_FROM && p.DEPTH_TO ? `${p.DEPTH_FROM}–${p.DEPTH_TO} ft` : 'All Depths',
    };
  }

  function formatNominatedLabel(props) {
    const p = props || {};
    return {
      title  : `Tract ${p.TRACT_NUMBER || '—'}`,
      county : p.COUNTY || '',
      acres  : p.ACRES ? `${Number(p.ACRES).toLocaleString()} ac` : '—',
      survey : p.SURVEY || '',
      block  : p.BLOCK  || '',
      type   : p.LAND_TYPE || '',
    };
  }

  return {
    fetchLeases,
    fetchLeasesInactive,
    fetchUnits,
    fetchUnitsInactive,
    fetchNominated,
    fetchPSF,
    formatLeaseLabel,
    formatInactiveLeaseLabel,
    formatUnitLabel,
    formatNominatedLabel,
    formatPSFLabel,
    clearCache: () => _cache.clear(),
    cacheSize : () => _cache.size,
  };

})();
