import { MathUtils, Ray, Sphere, Vector3 } from 'three';

const DEG2RAD = MathUtils.DEG2RAD;

/**
 * Plugin that implements foveated rendering by prioritizing tiles based on their position
 * relative to the camera's viewing direction. Tiles in the center of the view (foveal region)
 * are loaded at higher priority and detail than tiles in peripheral vision.
 *
 * This is similar to Cesium's foveated screen-space error approach, improving performance by
 * allowing peripheral tiles to load at lower detail levels.
 *
 * @example
 * ```js
 * const foveatedPlugin = new FoveatedRenderingPlugin({
 *     foveationConeFactor: 0.1,  // 10% of FOV for high-priority cone
 *     enableDeferral: true        // Allow peripheral tiles to defer loading
 * });
 * tiles.registerPlugin(foveatedPlugin);
 * ```
 */
export class FoveatedRenderingPlugin {

	/**
	 * Creates a new FoveatedRenderingPlugin instance.
	 * @param {Object} [options={}] Configuration options
	 * @param {number} [options.foveationConeFactor=0.1] Size of the high-priority foveal cone
	 * as a fraction of camera FOV (0.0-1.0). Smaller values create a tighter focus region.
	 * @param {boolean} [options.enableDeferral=true] Whether to defer loading of peripheral tiles
	 * that fall below error threshold due to SSE relaxation.
	 */
	constructor( options = {} ) {

		const {
			foveationConeFactor = 0.1,
			enableDeferral = true,
		} = options;

		this.name = 'FOVEATED_RENDERING_PLUGIN';
		this.priority = 0;

		/**
		 * Size of the high-priority foveal cone as a fraction of maximum FOV.
		 * Tiles within this cone get maximum priority. Valid range: 0.0 to 1.0.
		 * @type {number}
		 * @default 0.1
		 */
		this.foveationConeFactor = foveationConeFactor;

		/**
		 * When true, peripheral tiles that fall below the error threshold due to
		 * SSE relaxation can be deferred in loading priority.
		 * @type {boolean}
		 * @default true
		 */
		this.enableDeferral = enableDeferral;

		this.tiles = null;

		// Reusable objects for calculations
		this._ray = new Ray();
		this._sphere = new Sphere();
		this._closestPoint = new Vector3();
		this._closestPointOnSphere = new Vector3();
		this._directionOnSphere = new Vector3();
		this._cameraPosition = new Vector3();
		this._cameraDirection = new Vector3();

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	calculateTileViewError( tile, target ) {

		// Only modify priority if target is in view
		if ( ! target.inView ) {

			return false;

		}

		const { tiles } = this;
		const cameras = tiles.cameras;
		const cameraInfo = tiles.cameraInfo;
		const boundingVolume = tile.engineData.boundingVolume;

		// Safety check
		if ( ! tiles.group ) {

			return false;

		}

		// Get bounding sphere once for all cameras
		boundingVolume.getSphere( this._sphere );
		const sphere = this._sphere;

		// Calculate foveated factor for each camera and use the minimum
		// (minimum = closest to center of view = highest priority)
		let minFoveatedFactor = Infinity;
		let maxSSERelaxation = 0;
		let hasValidCamera = false;

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			const camera = cameras[ i ];
			const info = cameraInfo[ i ];
			const frustum = info.frustum;

			// Skip orthographic cameras - foveation doesn't apply
			if ( info.isOrthographic ) {

				continue;

			}

			// Skip this camera if tile is not in its frustum
			if ( ! boundingVolume.intersectsFrustum( frustum ) ) {

				continue;

			}

			hasValidCamera = true;

			// Calculate camera position in group local space
			this._cameraPosition.copy( info.position );

			// Calculate camera direction: get world direction and transform to group local space
			camera.getWorldDirection( this._cameraDirection );
			this._cameraDirection.transformDirection( tiles.group.matrixWorldInverse );
			this._cameraDirection.normalize();

			this._ray.set( this._cameraPosition, this._cameraDirection );

			// Find closest point on the ray to the sphere center
			this._ray.closestPointToPoint( sphere.center, this._closestPoint );
			const distanceToClosestPoint = this._closestPoint.distanceTo( sphere.center );

			// Check if camera is inside the bounding sphere
			const insideSphere = distanceToClosestPoint < sphere.radius;

			if ( insideSphere ) {

				// Camera is inside the tile - maximum priority
				minFoveatedFactor = 0;
				maxSSERelaxation = 0;
				break;

			} else {

				// Find closest point on the sphere surface
				this._closestPointOnSphere
					.subVectors( this._closestPoint, sphere.center )
					.normalize()
					.multiplyScalar( sphere.radius )
					.add( sphere.center );

				// Calculate direction from camera to closest point on sphere
				this._directionOnSphere
					.subVectors( this._closestPointOnSphere, this._cameraPosition )
					.normalize();

				// Calculate angular distance from camera direction
				// 0 = directly in view center, 1 = perpendicular to view
				const dotProduct = this._directionOnSphere.dot( this._cameraDirection );
				const foveatedFactor = 1 - dotProduct;

				// Calculate the maximum foveated factor (edge of FOV)
				const fov = camera.fov || 60; // Default to 60 if not set
				const maximumFoveatedFactor = 1.0 - Math.cos( fov * DEG2RAD * 0.5 );

				// Define the foveal cone threshold
				const foveatedConeThreshold = this.foveationConeFactor * maximumFoveatedFactor;

				// Track minimum foveated factor across all cameras
				minFoveatedFactor = Math.min( minFoveatedFactor, foveatedFactor );

				// Calculate SSE relaxation for tiles outside the foveal cone
				if ( foveatedFactor > foveatedConeThreshold && this.enableDeferral ) {

					const range = maximumFoveatedFactor - foveatedConeThreshold;
					const normalizedFoveatedFactor = MathUtils.clamp(
						( foveatedFactor - foveatedConeThreshold ) / range,
						0.0,
						1.0,
					);

					// Linear interpolation: relax error more for peripheral tiles
					const sseRelaxation = MathUtils.lerp( 0, target.error, normalizedFoveatedFactor );
					maxSSERelaxation = Math.max( maxSSERelaxation, sseRelaxation );

				}

			}

		}

		// If no valid perspective cameras processed, don't modify priority
		if ( ! hasValidCamera ) {

			return false;

		}

		// Set tile priority based on foveation
		// Priority encoding: visibility (most significant) + foveation + error (least significant)
		// Lower priority number = higher priority (loaded first)

		const visibility = target.inView ? 0 : 1;
		const inFrustum = tile.traversal?.inFrustum ? 0 : 1;
		const reverseError = 1 - MathUtils.clamp( target.error, 0, 1 );

		// Normalize foveated factor to 0-10000 range for priority encoding
		const foveatedPriority = Math.round( MathUtils.clamp( minFoveatedFactor, 0, 2 ) * 5000 );
		const errorPriority = Math.round( reverseError * 10000 );

		// Combine into single priority value with appropriate weighting
		// Format: [visibility:1][inFrustum:1][foveation:4-5 digits][error:4-5 digits]
		tile.priority =
			visibility * 1e10 +
			inFrustum * 1e9 +
			foveatedPriority * 1e4 +
			errorPriority;

		// Optionally mark tiles as deferred if they can be relaxed significantly
		if ( this.enableDeferral && maxSSERelaxation > 0 ) {

			const relaxedError = target.error - maxSSERelaxation;
			const errorTarget = tiles.errorTarget || 6;

			if ( relaxedError < errorTarget ) {

				// Increase priority value to defer this tile
				tile.priority += 5e8;

			}

		}

		// Return true to indicate we've modified the tile
		return true;

	}

	dispose() {

		this.tiles = null;

	}

}
