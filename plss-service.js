/**
 * OilManager — PLSS / Land Grid Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides BLM CadNSDI PLSS data (Township/Range/Section) for the Permian Basin
 * and West Texas dashboard map.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * Texas does NOT use the federal PLSS Township/Range/Section system.
 * Texas was an independent republic and retained its own Abstract/Block/Survey
 * land system managed by the Texas GLO. The BLM CadNSDI service covers 30 states
 * but explicitly excludes Texas.
 *
 * Coverage strategy:
 *   • BLM PLSS Layer 1 (Townships)  — NM side of Permian Basin (confirmed working)
 *   • BLM PLSS Layer 2 (Sections)   — NM side of Permian Basin (confirmed working)
 *   • Census TIGER County Grid       — Texas county boundaries as land context
 *
 * This module is intentionally separate from the private route/lease road system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PLSSService = (() => {

  // ── BLM CadNSDI endpoints ───────────────────────────────────────────────
  const BLM_BASE = 'https://gis.blm.gov/arcgis/rest/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer';
  const TIGER_BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer';

  const LAYER = {
    TOWNSHIP : 1,   // Township/Range polygons — fields: PLSSID, TWNSHPLAB, TWNSHPNO, TWNSHPDIR, RANGENO, RANGEDIR, STATEABBR
    SECTION  : 2,   // First division (section) polygons — fields: PLSSID, FRSTDIVNO, FRSTDIVLAB, FRSTDIVTYP
    TIGER_COUNTY: 13 // Census TIGER county subdivisions for Texas
  };

  // ── Viewport bbox cache — keyed by rounded bbox string ──────────────────
  const _cache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 min

  function _cacheKey(bbox, layer) {
    // Round to 2 decimal places so nearby pans reuse cache
    return `${layer}:${bbox.map(v => Math.round(v * 100) / 100).join(',')}`;
  }

  function _getCached(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
    return entry.data;
  }

  function _setCache(key, data) {
    // Keep cache size reasonable
    if (_cache.size > 80) {
      const oldest = _cache.keys().next().value;
      _cache.delete(oldest);
    }
    _cache.set(key, { ts: Date.now(), data });
  }

  // ── Build BLM query URL ─────────────────────────────────────────────────
  function _buildBLMUrl(layer, bbox, fields, maxRecords = 200) {
    const [west, south, east, north] = bbox;
    const params = new URLSearchParams({
      where: '1=1',
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: fields.join(','),
      returnGeometry: 'true',
      f: 'geojson',
      resultRecordCount: String(maxRecords),
    });
    return `${BLM_BASE}/${layer}/query?${params.toString()}`;
  }

  // ── Build Census TIGER county query URL ────────────────────────────────
  function _buildTIGERUrl(bbox, maxRecords = 50) {
    const [west, south, east, north] = bbox;
    const params = new URLSearchParams({
      where: "STATE='48'", // Texas FIPS = 48
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'NAME,GEOID,STATE,COUNTY',
      returnGeometry: 'true',
      f: 'geojson',
      resultRecordCount: String(maxRecords),
    });
    return `${TIGER_BASE}/${LAYER.TIGER_COUNTY}/query?${params.toString()}`;
  }

  // ── Generic fetch with timeout + error handling ─────────────────────────
  async function _fetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'BLM service error');
      return data;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') throw new Error('Request timed out');
      throw e;
    }
  }

  // ── Fetch townships for bbox ────────────────────────────────────────────
  async function fetchTownships(bbox) {
    const key = _cacheKey(bbox, 'twn');
    const cached = _getCached(key);
    if (cached) return cached;

    const url = _buildBLMUrl(LAYER.TOWNSHIP, bbox, [
      'PLSSID', 'TWNSHPLAB', 'TWNSHPNO', 'TWNSHPDIR',
      'RANGENO', 'RANGEDIR', 'STATEABBR', 'SRVNAME'
    ], 150);

    const data = await _fetch(url);
    _setCache(key, data);
    return data;
  }

  // ── Fetch sections for bbox ─────────────────────────────────────────────
  async function fetchSections(bbox) {
    const key = _cacheKey(bbox, 'sec');
    const cached = _getCached(key);
    if (cached) return cached;

    const url = _buildBLMUrl(LAYER.SECTION, bbox, [
      'PLSSID', 'FRSTDIVNO', 'FRSTDIVLAB', 'FRSTDIVTYP', 'FRSTDIVTXT'
    ], 300);

    const data = await _fetch(url);
    _setCache(key, data);
    return data;
  }

  // ── Fetch Census TIGER county grid for Texas bbox ───────────────────────
  async function fetchTexasCountyGrid(bbox) {
    const key = _cacheKey(bbox, 'tiger');
    const cached = _getCached(key);
    if (cached) return cached;

    const url = _buildTIGERUrl(bbox);
    const data = await _fetch(url);
    _setCache(key, data);
    return data;
  }

  // ── Point-in-polygon query — resolve legal land for a coordinate ─────────
  async function resolveLandContext(lng, lat) {
    const delta = 0.01;
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];
    const results = { plss: null, tiger: null };

    // Try BLM PLSS section first
    try {
      const params = new URLSearchParams({
        where: '1=1',
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'PLSSID,FRSTDIVNO,FRSTDIVLAB,FRSTDIVTYP',
        returnGeometry: 'false',
        f: 'json',
        resultRecordCount: '1',
      });
      const secUrl = `${BLM_BASE}/${LAYER.SECTION}/query?${params.toString()}`;
      const secData = await _fetch(secUrl);
      if (secData.features && secData.features.length > 0) {
        results.plss = { level: 'section', ...secData.features[0].attributes };
      }
    } catch (_) {}

    // Try BLM PLSS township
    if (!results.plss) {
      try {
        const params = new URLSearchParams({
          where: '1=1',
          geometry: `${lng},${lat}`,
          geometryType: 'esriGeometryPoint',
          inSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'PLSSID,TWNSHPLAB,TWNSHPNO,TWNSHPDIR,RANGENO,RANGEDIR,STATEABBR',
          returnGeometry: 'false',
          f: 'json',
          resultRecordCount: '1',
        });
        const twnUrl = `${BLM_BASE}/${LAYER.TOWNSHIP}/query?${params.toString()}`;
        const twnData = await _fetch(twnUrl);
        if (twnData.features && twnData.features.length > 0) {
          results.plss = { level: 'township', ...twnData.features[0].attributes };
        }
      } catch (_) {}
    }

    // Try Census TIGER for Texas county context
    try {
      const params = new URLSearchParams({
        where: "STATE='48'",
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'NAME,GEOID,STATE,COUNTY',
        returnGeometry: 'false',
        f: 'json',
        resultRecordCount: '1',
      });
      const tigerUrl = `${TIGER_BASE}/${LAYER.TIGER_COUNTY}/query?${params.toString()}`;
      const tigerData = await _fetch(tigerUrl);
      if (tigerData.features && tigerData.features.length > 0) {
        results.tiger = tigerData.features[0].attributes;
      }
    } catch (_) {}

    return results;
  }

  // ── Format PLSS label for UI display ────────────────────────────────────
  function formatPLSSLabel(feature) {
    const p = feature.properties || feature.attributes || {};

    if (p.TWNSHPLAB) {
      // Township level
      const state = p.STATEABBR || '';
      return {
        title: `Twp ${p.TWNSHPLAB}`,
        detail: `Township ${p.TWNSHPNO}${p.TWNSHPDIR} · Range ${p.RANGENO}${p.RANGEDIR}`,
        plssid: p.PLSSID || '',
        state,
        type: 'Township/Range',
      };
    }

    if (p.FRSTDIVNO !== undefined) {
      // Section level
      const secNum = p.FRSTDIVNO || p.FRSTDIVLAB || '?';
      return {
        title: `Section ${secNum}`,
        detail: p.FRSTDIVTXT || p.FRSTDIVLAB || '',
        plssid: p.PLSSID || '',
        type: 'Section',
      };
    }

    return { title: 'PLSS Area', detail: '', plssid: p.PLSSID || '', type: 'Unknown' };
  }

  // ── Determine if a bbox overlaps Texas area ──────────────────────────────
  function bboxIsTexas(bbox) {
    // Texas rough bounds: -106.6 to -93.5 lon, 25.8 to 36.5 lat
    const [west, south, east, north] = bbox;
    return east > -106.7 && west < -93.4 && north > 25.7 && south < 36.6;
  }

  // ── Determine if a bbox has NM coverage for PLSS ────────────────────────
  function bboxHasPLSSCoverage(bbox) {
    // NM bounds: -109.05 to -103.0 lon, 31.3 to 37.0 lat
    const [west, south, east, north] = bbox;
    return west < -103.0 && east > -109.1 && north > 31.2 && south < 37.1;
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    fetchTownships,
    fetchSections,
    fetchTexasCountyGrid,
    resolveLandContext,
    formatPLSSLabel,
    bboxIsTexas,
    bboxHasPLSSCoverage,
    clearCache: () => _cache.clear(),
    cacheSize: () => _cache.size,
  };

})();
