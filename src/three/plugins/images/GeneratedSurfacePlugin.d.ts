import { Vector3 } from 'three';
import { ImageOverlay } from './ImageOverlayPlugin.js';

export interface GeneratedSurfacePluginOptions {
	/** Overlay instance to derive the tiling scheme from. When `applyOverlayTexture` is enabled, also used to texture the generated tile meshes. */
	overlay?: ImageOverlay | null;
	/** Geometry shape: `'planar'` or `'ellipsoid'`. Only meaningful for cartographic sources. Default: `'ellipsoid'`. */
	shape?: 'planar' | 'ellipsoid';
	/** For Mercator ellipsoid mode, snap poles to ±90° lat. Default: `true`. */
	endCaps?: boolean;
	/** Shift planar tiles so the image is centered at origin. Default: `true`. */
	center?: boolean;
	/** Apply recommended TilesRenderer settings. Default: `true`. */
	useRecommendedSettings?: boolean;
	/** Whether to apply the overlay's texture to the generated tile meshes. Default: `false`. */
	applyOverlayTexture?: boolean;
}

export const TILE_X: symbol;
export const TILE_Y: symbol;
export const TILE_LEVEL: symbol;

/**
 * Plugin that generates tiled surface geometry from a tiling scheme, optionally loading
 * image overlay data.
 *
 * The tiling scheme and projection are derived from a provided overlay.
 * If the source's projection is cartographic (any EPSG scheme), the plugin supports
 * both planar and ellipsoidal geometry via the `shape` option.
 */
export class GeneratedSurfacePlugin {

	constructor( options?: GeneratedSurfacePluginOptions );

	priority: number;
	tiles: any;
	overlay: ImageOverlay | null;
	shape: 'planar' | 'ellipsoid';
	endCaps: boolean;
	center: boolean;
	useRecommendedSettings: boolean;
	applyOverlayTexture: boolean;

	/**
	 * Returns the cartographic coordinates for a given world-space position. "lat" and "lon" are assigned
	 * to the target object.
	 * @param position - World-space position. For ellipsoid surfaces this is a 3D point on the surface; for planar surfaces it is a 2D point in the plane.
	 * @param target - Optional target object to write results into.
	 * @returns The cartographic coordinates in radians.
	 * @throws Error if the tiling projection is not cartographic.
	 */
	getCartographicFromPosition( position: Vector3, target?: { lat?: number, lon?: number } ): { lat: number, lon: number };

	/**
	 * Returns the world-space position for a given cartographic coordinate.
	 * @param lat - Latitude in radians.
	 * @param lon - Longitude in radians.
	 * @param target - Optional target Vector3 to write results into.
	 * @returns The world-space position. For planar surfaces z is set to 0.
	 * @throws Error if the tiling projection is not cartographic.
	 */
	getPositionFromCartographic( lat: number, lon: number, target?: Vector3 ): Vector3;

	init( tiles: any ): void;
	loadRootTileset(): Promise<any>;
	parseToMesh( buffer: any, tile: any, extension: string, url: string, abortSignal: AbortSignal ): Promise<any>;
	preprocessNode( tile: any ): void;
	disposeTile( tile: any ): void;
	dispose(): void;
	getUrl( x: number, y: number, level: number ): string;
	fetchData( url: string ): ArrayBuffer | undefined;
	createBoundingVolume( x: number, y: number, level: number, regionHeight?: number ): any;
	createChild( x: number, y: number, level: number ): any;
	expandChildren( tile: any ): void;
	getTileset(): any;

}
