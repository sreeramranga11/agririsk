import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMapEvents } from 'react-leaflet';
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
import AgricultureIcon from '@mui/icons-material/Agriculture';

interface RiskResult {
  risk_score: number;
  premium: number;
  report: Record<string, any>;
}

interface CaseData {
  name: string;
  polygon: any | null;
  riskResult: RiskResult | null;
  created: string;
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
        />
      </FeatureGroup>
      {latlng && (
        <Box sx={{ position: 'absolute', bottom: 16, right: 16, bgcolor: 'white', p: 1, borderRadius: 1, boxShadow: 2, zIndex: 1000 }}>
          <Typography variant="caption">Lat: {latlng.lat.toFixed(5)}, Lon: {latlng.lng.toFixed(5)}</Typography>
        </Box>
      )}
    </>
  );
};

function App() {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CASES_KEY);
    if (saved) setCases(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }, [cases]);

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
        body: JSON.stringify({ polygon: geojson }),
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

  // Home page content
  const HomePage = () => (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        height: '100vh',
        bgcolor: 'background.default',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #f4f6fa 0%, #e3e9f6 100%)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <AgricultureIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, letterSpacing: 1 }}>
            Precision AgriRisk
          </Typography>
          <Typography variant="h5" sx={{ mb: 2, color: 'text.primary', fontWeight: 500, letterSpacing: 0.5 }}>
            Underwriter Workbench
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 4, color: 'text.secondary', maxWidth: 500, mx: 'auto', fontSize: 20 }}>
            The next generation of crop insurance risk assessment.<br />
            Draw, analyze, and manage field-level risk with geospatial AI.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            sx={{ px: 5, py: 2, fontSize: 20, borderRadius: 3, boxShadow: 3 }}
            onClick={() => setCaseDialogOpen(true)}
          >
            Create New Case
          </Button>
        </Box>
        {cases.length > 0 && (
          <Box sx={{ width: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}>
              Recent Cases
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxHeight: 260, overflow: 'auto', p: 1, width: '100%' }}>
              {cases.slice(-5).reverse().map((c, i) => (
                <Card
                  key={i}
                  sx={{
                    minWidth: 160,
                    maxWidth: 180,
                    p: 1,
                    borderRadius: 2,
                    boxShadow: 2,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-2px) scale(1.03)' },
                    bgcolor: 'background.paper',
                  }}
                  onClick={() => setSelectedIdx(cases.length - 1 - i)}
                >
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 18, mb: 0.5 }}>
                      {c.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(c.created).toLocaleDateString()}<br />
                      {new Date(c.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <AppBar position="absolute" color="primary" elevation={2} sx={{ zIndex: 1201 }}>
        <Toolbar>
          {currentCase ? (
            <Tooltip title="Home">
              <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => setSelectedIdx(null)}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Precision AgriRisk Underwriter Workbench</Typography>
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
      {/* Map Fullscreen or Home Page */}
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
        <HomePage />
      )}
      {/* Results Panel (floating, bottom) */}
      {currentCase && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1202, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <Box sx={{ width: '90vw', maxWidth: 1200, pointerEvents: 'auto' }}>
            {loading && <Card sx={{ mb: 2, boxShadow: 2 }}><CardContent><Typography>Calculating risk...</Typography></CardContent></Card>}
            {error && <Card sx={{ mb: 2, boxShadow: 2 }}><CardContent><Typography color="error">{error}</Typography></CardContent></Card>}
            {currentCase.riskResult && (
              <Card sx={{ mb: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{currentCase.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Created: {new Date(currentCase.created).toLocaleString()}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1"><b>Risk Score:</b> {currentCase.riskResult.risk_score}</Typography>
                  <Typography variant="subtitle1"><b>Premium:</b> ${currentCase.riskResult.premium.toLocaleString()}</Typography>
                  <Typography variant="subtitle2"><b>Area:</b> {currentCase.riskResult.report.Area_ha} ha ({(currentCase.riskResult.report.Area_ha * 2.47105).toLocaleString(undefined, { maximumFractionDigits: 0 })} acres)</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Breakdown:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><b>NDVI:</b> {currentCase.riskResult.report.NDVI} <Tooltip title="Normalized Difference Vegetation Index (higher = more vegetation)"><span>[?]</span></Tooltip></li>
                    <li><b>Elevation:</b> {currentCase.riskResult.report.Elevation_m} m <Tooltip title="Higher elevation usually means less flood risk."><span>[?]</span></Tooltip></li>
                    <li><b>Weather:</b> {currentCase.riskResult.report.Weather_value} <Tooltip title="Recent rainfall or weather metric (mm)"><span>[?]</span></Tooltip></li>
                  </ul>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Polygon Coordinates:</Typography>
                  <Box sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f5f5f5', p: 1, borderRadius: 1, maxHeight: 120, overflow: 'auto' }}>
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
    </Box>
  );
}

export default App;
