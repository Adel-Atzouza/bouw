"use client";

import { useState } from "react";
import { mapOrigin, mapPoint, mapResolution, validGeometry } from "@/lib/dso-geometry";
import type { Address, DsoGeometry } from "@/lib/dso";

const width = 600, height = 360;

export default function PermitLocation({ address, geometry, onChange }: { address: Address; geometry: DsoGeometry | null; onChange: (geometry: DsoGeometry | null) => void }) {
  const [center, setCenter] = useState(address.coordinates);
  const [zoom, setZoom] = useState(14);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [cursor, setCursor] = useState<[number, number]>([width / 2, height / 2]);
  const [mapError, setMapError] = useState(false);
  const [error, setError] = useState("");
  const resolution = mapResolution(zoom);
  const left = (center[0] - mapOrigin[0]) / resolution - width / 2;
  const top = (mapOrigin[1] - center[1]) / resolution - height / 2;
  const pixels = (point: [number, number]) => [(point[0] - center[0]) / resolution + width / 2, (center[1] - point[1]) / resolution + height / 2];
  const tiles = [];
  for (let col = Math.floor(left / 256); col <= Math.floor((left + width) / 256); col++) {
    for (let row = Math.floor(top / 256); row <= Math.floor((top + height) / 256); row++) {
      tiles.push(<image key={`${zoom}/${col}/${row}`} x={col * 256 - left} y={row * 256 - top} width="256" height="256" href={`https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:28992/${String(zoom).padStart(2, "0")}/${col}/${row}.png`} onError={() => setMapError(true)} />);
    }
  }
  const polygon = drawing ? points : geometry?.type === "Polygon" ? geometry.coordinates[0] : [];
  function select(pixel: [number, number]) {
    const point = mapPoint(center, zoom, pixel, [width, height]);
    setError("");
    if (drawing) { if (points.length < 100) setPoints([...points, point]); }
    else if (validGeometry({ type: "Point", coordinates: point })) onChange({ type: "Point", coordinates: point });
  }
  function finish() {
    const shape: DsoGeometry = { type: "Polygon", coordinates: [[...points, points[0]]] };
    if (!validGeometry(shape)) { setError("Kies minimaal drie verschillende hoeken. Laat de lijnen elkaar niet kruisen en teken een gebied van minstens 1 m²."); return; }
    onChange(shape); setDrawing(false); setError("");
  }
  return <div className="permit-map-section">
    <div className="permit-map-heading"><strong>Waar vinden de werkzaamheden plaats?</strong><p>Kies een punt, of teken de omtrek van het hele werkgebied. Neem bij een uitbouw ook het deel achter de woning mee.</p></div>
    <div className="permit-map-tools" aria-label="Werklocatie kiezen">
      <button type="button" aria-pressed={!drawing} onClick={() => { setDrawing(false); setPoints([]); setError(""); }}>Punt aanwijzen</button>
      <button type="button" aria-pressed={drawing} onClick={() => { setDrawing(true); setPoints([]); onChange(null); setError(""); }}>Gebied tekenen</button>
      <button type="button" onClick={() => { setCenter(address.coordinates); setZoom(14); }}>Naar mijn adres</button>
    </div>
    <div className="permit-map">
      <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Kaart van uw werklocatie. Gebruik de pijltjestoetsen om de kruisdraad te verplaatsen en Enter om een punt te kiezen." tabIndex={0} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); select([(event.clientX - rect.left) / rect.width * width, (event.clientY - rect.top) / rect.height * height]); }} onKeyDown={(event) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) event.preventDefault();
        if (event.key === "Enter" || event.key === " ") select(cursor);
        else if (event.key.startsWith("Arrow")) setCursor(([x, y]) => [Math.max(0, Math.min(width, x + (event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0))), Math.max(0, Math.min(height, y + (event.key === "ArrowDown" ? 10 : event.key === "ArrowUp" ? -10 : 0)))]);
      }}>
        <rect width={width} height={height} fill="#edf0ea" />{tiles}
        <circle cx={pixels(address.coordinates)[0]} cy={pixels(address.coordinates)[1]} r="5" fill="white" stroke="#405961" strokeWidth="2" />
        {polygon.length > 0 && <><polygon points={polygon.map((p) => pixels(p).join(",")).join(" ")} fill="#862d4a33" stroke="#862d4a" strokeWidth="2" />{polygon.map((p, i) => <circle key={i} cx={pixels(p)[0]} cy={pixels(p)[1]} r="4" fill="#862d4a" />)}</>}
        {!drawing && geometry?.type === "Point" && <circle cx={pixels(geometry.coordinates)[0]} cy={pixels(geometry.coordinates)[1]} r="8" fill="#862d4a" stroke="white" strokeWidth="3" />}
        <path className="map-cursor" d={`M${cursor[0] - 10},${cursor[1]}h20 M${cursor[0]},${cursor[1] - 10}v20`} stroke="#172d38" strokeWidth="2" />
      </svg>
      <div className="permit-map-navigation" aria-label="Kaart verplaatsen en zoomen">
        <button type="button" aria-label="Kaart naar het noorden" onClick={() => setCenter([center[0], center[1] + 80 * resolution])}>↑</button>
        <button type="button" aria-label="Inzoomen" disabled={zoom === 14} onClick={() => setZoom(zoom + 1)}>+</button>
        <button type="button" aria-label="Kaart naar het westen" onClick={() => setCenter([center[0] - 80 * resolution, center[1]])}>←</button>
        <button type="button" aria-label="Kaart naar het oosten" onClick={() => setCenter([center[0] + 80 * resolution, center[1]])}>→</button>
        <button type="button" aria-label="Kaart naar het zuiden" onClick={() => setCenter([center[0], center[1] - 80 * resolution])}>↓</button>
        <button type="button" aria-label="Uitzoomen" disabled={zoom === 10} onClick={() => setZoom(zoom - 1)}>−</button>
      </div>
      <a className="permit-map-credit" href="https://www.pdok.nl/introductie/-/article/basisregistratie-topografie-achtergrondkaarten-brt-a-" target="_blank" rel="noopener noreferrer">Kaart: Kadaster / PDOK</a>
    </div>
    {drawing && <div className="permit-map-tools"><span>{points.length} hoeken gekozen</span><button type="button" disabled={!points.length} onClick={() => setPoints(points.slice(0, -1))}>Laatste punt wissen</button><button type="button" disabled={points.length < 3} onClick={finish}>Gebied afronden</button></div>}
    {error && <p className="error-notice" role="alert">{error}</p>}
    {mapError && <p className="error-notice">De kaart is niet volledig geladen. Gebruik het adrespunt voor een beperkte check of probeer de kaart later opnieuw.</p>}
    <button className="back-link" type="button" onClick={() => { onChange({ type: "Point", coordinates: address.coordinates }); setDrawing(false); setPoints([]); }}>Alleen het adrespunt gebruiken</button>
    <p className="permit-form-note">{geometry?.type === "Polygon" ? "Het getekende gebied wordt voor de check gebruikt." : geometry?.type === "Point" ? "Alleen het gekozen punt wordt gecontroleerd. Regels op andere delen van het perceel kunnen verschillen." : "Kies en bevestig een werklocatie om verder te gaan."} De kaartbeelden worden bij PDOK opgehaald.</p>
  </div>;
}
