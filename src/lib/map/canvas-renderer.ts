import L from "leaflet";

// Leaflet 1.9.4 can lose a queued frame's ID when a synchronous view update
// calls _redraw first. Removing the map then leaves that frame targeting a
// destroyed canvas. Keep the lifecycle guard local to this map's renderer.
const redraw = (L.Canvas.prototype as L.Canvas & { _redraw(): void })._redraw;
export class MapCanvas extends L.Canvas {
  private mounted = false;

  onAdd(map: L.Map): this {
    this.mounted = true;
    super.onAdd(map);
    return this;
  }

  onRemove(map: L.Map): this {
    this.mounted = false;
    super.onRemove(map);
    return this;
  }

  _redraw() {
    if (this.mounted) redraw.call(this);
  }
}
