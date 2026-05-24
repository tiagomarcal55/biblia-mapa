export class Camera {
  public screenW: number = 800;
  public screenH: number = 600;
  public scale: number = 0.05; // pixels per year
  public centerYear: number = 0; // focal year

  private minYear: number = -4000;
  private maxYear: number = 3000;

  constructor() {}

  public setBounds(min: number, max: number) {
    this.minYear = min;
    this.maxYear = max;
    this.clamp();
  }

  public get visibleWorldLeft(): number {
    return this.centerYear - (this.screenW / 2) / this.scale;
  }

  public get visibleWorldRight(): number {
    return this.centerYear + (this.screenW / 2) / this.scale;
  }

  public worldToScreenX(worldX: number): number {
    return (worldX - this.centerYear) * this.scale + this.screenW / 2;
  }

  public screenToWorldX(screenX: number): number {
    return this.centerYear + (screenX - this.screenW / 2) / this.scale;
  }

  public jumpTo(year: number, scale: number) {
    this.centerYear = year;
    this.scale = scale;
    this.clamp();
  }

  public startDrag() {
    // Ready to drag
  }

  public pan(dx: number, _dy: number) {
    // Sliders timelines: mouse moving right (dx > 0) decreases centerYear (panning left)
    this.centerYear -= dx / this.scale;
    this.clamp();
  }

  public endDrag() {
    // Finished dragging
  }

  public zoomAt(screenX: number, factor: number) {
    const prevScale = this.scale;
    const nextScale = Math.max(0.00001, Math.min(1000, prevScale * factor));
    
    // Lock zoom point to mouse cursor screenX
    const worldX = this.screenToWorldX(screenX);
    this.scale = nextScale;
    this.centerYear = worldX - (screenX - this.screenW / 2) / this.scale;
    
    this.clamp();
  }

  public update() {
    this.clamp();
  }

  private clamp() {
    this.scale = Math.max(0.00001, Math.min(1000, this.scale));
    
    if (this.centerYear < this.minYear) this.centerYear = this.minYear;
    if (this.centerYear > this.maxYear) this.centerYear = this.maxYear;
  }
}