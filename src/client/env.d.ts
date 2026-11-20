// env.d.ts: Vite's ?raw imports return the file as a string (used for the SVG icons).
declare module "*.svg?raw" {
  const markup: string;
  export default markup;
}
