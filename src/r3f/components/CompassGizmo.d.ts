import type {
	ReactNode,
	ForwardRefExoticComponent,
	RefAttributes,
} from 'react';
import type { Group } from 'three';
import { Ellipsoid } from '../../three/renderer/math/Ellipsoid.js';
import { TilesRenderer } from '../../three/renderer/tiles/TilesRenderer.js';

interface CompassGizmoProps {
	children?: ReactNode;
	ellipsoid?: Ellipsoid;
	tileGroup?: Group;
	tilesRenderer?: TilesRenderer;
	mode?: '3d' | '2d';
	visible?: boolean;
	scale?: number;
	margin?: number | [number, number];
	overrideRenderLoop?: boolean;
}

export declare const CompassGizmo: ForwardRefExoticComponent<
	CompassGizmoProps & RefAttributes<Group>
>;
