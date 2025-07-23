import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, Marker, useMapEvents } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent, Divider, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import mockClaims from './mock_claims.json';
import logo from './logo.png';

interface RiskResult {
  risk_score: number;
  premium: number;
  perils: Record<string, number>;
  peril_premiums: Record<string, number>;
  explanations: Record<string, string>;
  report: Record<string, any>;
}

interface CaseData {
  name: string;
  polygon: any | null;
  riskResult: RiskResult | null;
  created: string;
}

// Add Claim type
interface Claim {
  caseName: string;
  date: string;
  amount: number;
  peril: string;
  notes?: string;
}

const BACKEND_URL = 'http://localhost:8000/risk';
const CASES_KEY = 'agririsk_cases';

const MapWithDraw = ({ onPolygonDraw, polygon }: { onPolygonDraw: (geojson: any) => void, polygon: any | null }) => {
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [latlng, setLatlng] = useState<{ lat: number, lng: number } | null>(null);

  useMapEvents({
    mousemove(e) {
      setLatlng(e.latlng);
    },
  });

  useEffect(() => {
    if (featureGroupRef.current && polygon) {
      featureGroupRef.current.clearLayers();
      const layer = L.geoJSON(polygon).getLayers()[0];
      if (layer) featureGroupRef.current.addLayer(layer);
    }
  }, [polygon]);

  return (
    <>
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: true,
          }}
          onCreated={(e: any) => {
            const layer = e.layer;
            const geojson = layer.toGeoJSON();
            onPolygonDraw(geojson);
          }}
          onDeleted={() => {
            onPolygonDraw(null);
          }}
          onEdited={(e: any) => {
            const layers = e.layers.getLayers();
            if (layers.length > 0) {
              const geojson = layers[0].toGeoJSON();
              onPolygonDraw(geojson);
            }
          }}
        />
      </FeatureGroup>
      {latlng && (
        <Box sx={{ position: 'absolute', top: 75, left: 11, bgcolor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(26,34,54,0.08)', p: 1, borderRadius: 1, boxShadow: 2, zIndex: 1000 }}>
          <Typography variant="caption">Lat: {latlng.lat.toFixed(5)}, Lon: {latlng.lng.toFixed(5)}</Typography>
        </Box>
      )}
    </>
  );
};

function PortfolioDashboard({ cases, onNewCase, claims, onNewClaim }: { cases: CaseData[], onNewCase: () => void, claims: Claim[], onNewClaim: () => void }) {
  // Calculate total insured value
  const totalInsured = cases.reduce((sum, c) => sum + (c.riskResult?.premium || 0), 0);
  // Aggregate risk exposure by peril
  const perilExposure: Record<string, number> = {};
  cases.forEach(c => {
    if (c.riskResult && c.riskResult.peril_premiums) {
      Object.entries(c.riskResult.peril_premiums).forEach(([peril, premium]) => {
        perilExposure[peril] = (perilExposure[peril] || 0) + premium;
      });
    }
  });
  // Hotspot polygons: high risk_score
  const hotspots = cases.filter(c => c.riskResult && c.riskResult.risk_score > 0.6 && c.polygon);
  // Recent claims (mock)
  const recentClaims = claims.slice(-5).reverse();
  return (
    <Box className="dashboard-glass" sx={{ width: '100%', minHeight: '100vh', py: 4, px: { xs: 1, md: 4 }, fontFamily: 'inherit', boxSizing: 'border-box', margin: '0 auto', maxWidth: 1200 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a2236', letterSpacing: 0.5 }}>Portfolio Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ background: 'linear-gradient(90deg, #1a2236 0%, #233044 100%)', color: 'white', borderRadius: 2, fontWeight: 600, boxShadow: 2, fontSize: 18, px: 3, py: 1.2 }}
            onClick={onNewCase}
          >
            New Case
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2, fontWeight: 600, fontSize: 18, px: 3, py: 1.2, borderColor: '#1a2236', color: '#1a2236' }}
            onClick={onNewClaim}
          >
            New Claim
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 4, justifyContent: 'center' }}>
        <Card sx={{ minWidth: 240, p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 16px 0 rgba(26,34,54,0.08)', border: '1.5px solid #e3eafc', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 0 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1, letterSpacing: 0.2 }}>Total Insured Value</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a2236', mb: 0.5 }}>${totalInsured.toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 240, p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 16px 0 rgba(26,34,54,0.08)', border: '1.5px solid #e3eafc', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 0 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1, letterSpacing: 0.2 }}>Risk Exposure by Peril</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, color: '#1a2236', fontSize: 16 }}>
              {Object.entries(perilExposure).map(([peril, value]) => (
                <li key={peril} style={{ marginBottom: 2 }}><b>{peril.charAt(0).toUpperCase() + peril.slice(1)}:</b> ${value.toLocaleString()}</li>
              ))}
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 240, p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 16px 0 rgba(26,34,54,0.08)', border: '1.5px solid #e3eafc', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 0 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 500, mb: 1, letterSpacing: 0.2 }}>Recent Claims</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, color: '#1a2236', fontSize: 16 }}>
              {recentClaims.map((claim, i) => (
                <li key={i} style={{ marginBottom: 2 }}><b>{claim.caseName}</b> - ${claim.amount} ({claim.peril})<br /><span style={{ fontSize: 13, color: '#888' }}>{new Date(claim.date).toLocaleDateString()}</span></li>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ height: 400, width: { xs: '100%', md: 1000 }, mx: 'auto', mb: 4, borderRadius: 3, overflow: 'hidden', boxShadow: 2, position: 'relative', background: 'rgba(255,255,255,0.6)' }}>
        <MapContainer center={[37.8, -119.7]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Show all polygons, color by risk */}
          {cases.map((c, i) => c.polygon && (
            <GeoJSON
              key={i}
              data={c.polygon}
              style={{
                color: c.riskResult && c.riskResult.risk_score > 0.6 ? '#d32f2f' : c.riskResult && c.riskResult.risk_score > 0.3 ? '#fbc02d' : '#388e3c',
                weight: 3,
                fillOpacity: 0.3
              }}
            />
          ))}
          {/* Hotspot markers */}
          {hotspots.map((c, i) => c.polygon && (
            <Marker
              key={i}
              position={[c.polygon.geometry.coordinates[0][0][1], c.polygon.geometry.coordinates[0][0][0]]}
              icon={L.divIcon({ className: 'hotspot-marker', html: '<div style="background:#d32f2f;color:white;padding:2px 6px;border-radius:8px;font-size:12px;">Hotspot</div>' })}
            />
          ))}
        </MapContainer>
      </Box>
    </Box>
  );
}

function App() {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coverage, setCoverage] = useState(1.0);
  const [claims, setClaims] = useState<Claim[]>(() => {
    const saved = localStorage.getItem('agririsk_claims');
    return saved ? JSON.parse(saved) : [];
  });
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<{ caseName: string; date: string; amount: string; peril: string; notes: string }>({
    caseName: '',
    date: '',
    amount: '',
    peril: '',
    notes: ''
  });
  const [panelMinimized, setPanelMinimized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CASES_KEY);
    if (saved) setCases(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('agririsk_claims', JSON.stringify(claims));
  }, [claims]);

  const currentCase = selectedIdx !== null ? cases[selectedIdx] : null;

  const handleNewCase = () => {
    setCases([
      ...cases,
      { name: newCaseName, polygon: null, riskResult: null, created: new Date().toISOString() },
    ]);
    setSelectedIdx(cases.length);
    setNewCaseName('');
    setCaseDialogOpen(false);
  };

  const handlePolygonDraw = async (geojson: any) => {
    if (!currentCase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon: geojson, coverage }),
      });
      if (!res.ok) throw new Error('Backend error');
      const data = await res.json();
      const updatedCase = { ...currentCase, polygon: geojson, riskResult: data };
      setCases(cases.map((c, i) => (i === selectedIdx ? updatedCase : c)));
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCase = (idx: number) => {
    const newCases = cases.filter((_, i) => i !== idx);
    setCases(newCases);
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && idx < selectedIdx) setSelectedIdx(selectedIdx - 1);
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header with logo */}
      <AppBar position="absolute" color="default" elevation={2} sx={{ zIndex: 1201, background: '#f8fafc', fontFamily: 'Inter, Roboto, Lato, Arial, sans-serif', borderBottom: '1.5px solid #e3eafc' }}>
        <Toolbar>
          <img src={logo} alt="Logo" style={{ height: 44, marginRight: 16 }} />
          {currentCase ? (
            <Tooltip title="Home">
              <IconButton color="primary" edge="start" sx={{ mr: 2, color: '#1a2236' }} onClick={() => setSelectedIdx(null)}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <IconButton color="primary" edge="start" sx={{ mr: 2, color: '#1a2236' }} onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}></Typography>
          <Typography variant="subtitle1">{currentCase ? currentCase.name : ''}</Typography>
        </Toolbar>
      </AppBar>
      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, bgcolor: '#233044', color: 'white', height: '100%' }}>
          <Toolbar />
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Cases</Typography>
            <Tooltip title="New Case"><IconButton color="inherit" onClick={() => setCaseDialogOpen(true)}><AddIcon /></IconButton></Tooltip>
          </Box>
          <List>
            {cases.map((c, i) => (
              <ListItem component="div" key={i} onClick={() => { setSelectedIdx(i); setDrawerOpen(false); }} style={{ cursor: 'pointer', background: i === selectedIdx ? '#2e3b55' : undefined, fontWeight: i === selectedIdx ? 700 : 400 }}>
                <ListItemText primary={c.name} secondary={new Date(c.created).toLocaleString()} />
                <Tooltip title="Delete"><IconButton color="inherit" size="small" onClick={e => { e.stopPropagation(); handleDeleteCase(i); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      {/* Main content area, scrollable */}
      <Box sx={{ flex: 1, overflow: 'auto', pt: 8 }}>
        {/* Map or Dashboard */}
        {currentCase ? (
          <Box sx={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
            <MapContainer center={[37.8, -119.7]} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapWithDraw onPolygonDraw={handlePolygonDraw} polygon={currentCase.polygon} />
            </MapContainer>
          </Box>
        ) : (
          <PortfolioDashboard
            cases={cases}
            onNewCase={() => setCaseDialogOpen(true)}
            claims={claims}
            onNewClaim={() => setClaimDialogOpen(true)}
          />
        )}
      </Box>
      {/* Results Panel (floating, bottom) */}
      {currentCase && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1202, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <Box sx={{ width: '90vw', maxWidth: 1200, pointerEvents: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <IconButton size="small" onClick={() => setPanelMinimized(m => !m)}>
                {panelMinimized ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            {!panelMinimized && (
              <>
                {loading && <Card sx={{ mb: 2, boxShadow: 2 }}><CardContent><Typography>Calculating risk...</Typography></CardContent></Card>}
                {error && <Card sx={{ mb: 2, boxShadow: 2 }}><CardContent><Typography color="error">{error}</Typography></CardContent></Card>}
                {currentCase.riskResult && (
                  <Card sx={{
                    mb: 2,
                    boxShadow: 2,
                    background: 'rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(26,34,54,0.08)',
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{currentCase.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Created: {new Date(currentCase.created).toLocaleString()}</Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="subtitle1"><b>Risk Score:</b> {currentCase.riskResult.risk_score}</Typography>
                        <Typography variant="subtitle1"><b>Premium:</b> ${currentCase.riskResult.premium.toLocaleString()}</Typography>
                        <Typography variant="subtitle2"><b>Coverage:</b></Typography>
                        <input
                          type="range"
                          min={0.5}
                          max={2.0}
                          step={0.05}
                          value={coverage}
                          onChange={e => {
                            setCoverage(Number(e.target.value));
                            if (currentCase.polygon) handlePolygonDraw(currentCase.polygon);
                          }}
                          style={{ width: 120 }}
                        />
                        <span style={{ minWidth: 40, display: 'inline-block', textAlign: 'center' }}>{coverage}x</span>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>Multi-Peril Risk Breakdown:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        {currentCase.riskResult && Object.entries(currentCase.riskResult.perils).map(([peril, score]) => (
                          <Card key={peril} sx={{ minWidth: 140, p: 1, bgcolor: '#f8fafc', borderRadius: 2, boxShadow: 1 }}>
                            <CardContent sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{peril.charAt(0).toUpperCase() + peril.slice(1)}</Typography>
                              <Typography variant="h6" color={score > 0.6 ? 'error.main' : score > 0.3 ? 'warning.main' : 'success.main'}>{score}</Typography>
                              <Typography variant="body2" color="text.secondary">Premium: ${currentCase.riskResult?.peril_premiums[peril]}</Typography>
                              <Typography variant="caption" color="text.secondary">{currentCase.riskResult?.explanations[peril]}</Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Polygon Coordinates:</Typography>
                      <Box sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(26,34,54,0.08)', p: 1, borderRadius: 1, maxHeight: 120, overflow: 'auto' }}>
                        {currentCase.polygon && currentCase.polygon.geometry && currentCase.polygon.geometry.coordinates[0].map((coord: number[], idx: number) => (
                          <span key={idx}>({coord[1].toFixed(5)}, {coord[0].toFixed(5)}) </span>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}
                {!currentCase.polygon && (
                  <Card sx={{ mb: 2, boxShadow: 2 }}><CardContent><Typography variant="body2" color="text.secondary">Draw a polygon on the map to analyze risk for this case.</Typography></CardContent></Card>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
      {/* New Case Dialog */}
      <Dialog open={caseDialogOpen} onClose={() => setCaseDialogOpen(false)}>
        <DialogTitle>New Case</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Case Name" fullWidth value={newCaseName} onChange={e => setNewCaseName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaseDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNewCase} disabled={!newCaseName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
      {/* New Claim Dialog */}
      <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>File New Claim</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="Case"
            value={claimForm.caseName}
            onChange={e => setClaimForm(f => ({ ...f, caseName: e.target.value }))}
            SelectProps={{ native: true }}
            fullWidth
          >
            <option value="" disabled>Select a case</option>
            {cases.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </TextField>
          <TextField
            label="Date of Event"
            type="date"
            value={claimForm.date}
            onChange={e => setClaimForm(f => ({ ...f, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            select
            label="Peril"
            value={claimForm.peril}
            onChange={e => setClaimForm(f => ({ ...f, peril: e.target.value }))}
            SelectProps={{ native: true }}
            fullWidth
          >
            <option value="" disabled>Select peril</option>
            <option value="drought">Drought</option>
            <option value="flood">Flood</option>
            <option value="hail">Hail</option>
            <option value="frost">Frost</option>
            <option value="pestilence">Pestilence</option>
          </TextField>
          <TextField
            label="Claimed Amount ($)"
            type="number"
            value={claimForm.amount}
            onChange={e => setClaimForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Notes (optional)"
            value={claimForm.notes}
            onChange={e => setClaimForm(f => ({ ...f, notes: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!claimForm.caseName || !claimForm.date || !claimForm.peril || !claimForm.amount}
            onClick={() => {
              setClaims([...claims, {
                caseName: claimForm.caseName,
                date: claimForm.date,
                amount: Number(claimForm.amount),
                peril: claimForm.peril,
                notes: claimForm.notes
              }]);
              setClaimDialogOpen(false);
              setClaimForm({ caseName: '', date: '', amount: '', peril: '', notes: '' });
            }}
          >Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
