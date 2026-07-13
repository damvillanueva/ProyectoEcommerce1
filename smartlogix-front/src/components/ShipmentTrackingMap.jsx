import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function MapViewport({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates.length) {
      return;
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(coordinates), {
      padding: [36, 36],
    });
  }, [coordinates, map]);

  return null;
}

function ShipmentTrackingMap({ origin, destination, routeCoordinates }) {
  if (!destination) {
    return (
      <div className="h-[360px] rounded-3xl border border-dashed border-white/15 bg-slate-950/60 flex items-center justify-center p-6 text-center text-slate-400">
        No se pudieron ubicar coordenadas validas para mostrar el mapa del envio.
      </div>
    );
  }

  const coordinates = routeCoordinates.length
    ? routeCoordinates
    : [[destination.lat, destination.lng]];

  return (
    <div className="h-[360px] overflow-hidden rounded-3xl border border-white/10">
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport coordinates={coordinates} />

        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#60a5fa",
              weight: 5,
              opacity: 0.9,
              dashArray: "10 12",
            }}
          />
        )}

        {origin && (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={10}
            pathOptions={{
              color: "#22c55e",
              fillColor: "#22c55e",
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <strong>Origen</strong>
              <br />
              {origin.label}
            </Popup>
          </CircleMarker>
        )}

        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={10}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <strong>Destino</strong>
            <br />
            {destination.label}
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

export default ShipmentTrackingMap;
