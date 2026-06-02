export interface FoveatedRenderingPluginOptions {
	/**
	 * Size of the high-priority foveal cone as a fraction of camera FOV.
	 * Tiles within this cone get maximum priority. Valid range: 0.0 to 1.0.
	 * @default 0.1
	 */
	foveationConeFactor?: number;

	/**
	 * When true, peripheral tiles that fall below the error threshold due to
	 * SSE relaxation can be deferred in loading priority.
	 * @default true
	 */
	enableDeferral?: boolean;
}

/**
 * Plugin that implements foveated rendering by prioritizing tiles based on their position
 * relative to the camera's viewing direction. Tiles in the center of the view (foveal region)
 * are loaded at higher priority and detail than tiles in peripheral vision.
 * 
 * This is similar to Cesium's foveated screen-space error approach, improving performance by
 * allowing peripheral tiles to load at lower detail levels.
 */
export class FoveatedRenderingPlugin {

	/**
	 * Plugin name identifier.
	 */
	name: string;

	/**
	 * Plugin execution priority (lower values run first).
	 */
	priority: number;

	/**
	 * Size of the high-priority foveal cone as a fraction of maximum FOV.
	 * Tiles within this cone get maximum priority. Valid range: 0.0 to 1.0.
	 */
	foveationConeFactor: number;

	/**
	 * When true, peripheral tiles that fall below the error threshold due to
	 * SSE relaxation can be deferred in loading priority.
	 */
	enableDeferral: boolean;

	/**
	 * Reference to the tiles renderer.
	 */
	tiles: any;

	/**
	 * @param options Configuration options for the plugin.
	 */
	constructor( options?: FoveatedRenderingPluginOptions );

	/**
	 * Called when the plugin is registered to a tiles renderer.
	 * @param tiles The tiles renderer instance.
	 */
	init( tiles: any ): void;

	/**
	 * Calculates tile view error and sets tile priority based on foveation.
	 * @param tile The tile to calculate priority for.
	 * @param target The target object containing view error information.
	 * @returns true if the tile was modified, false otherwise.
	 */
	calculateTileViewError( tile: any, target: any ): boolean;

	/**
	 * Called when the plugin is unregistered. Cleans up resources.
	 */
	dispose(): void;

}
