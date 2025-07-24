export class ProjectionScheme {

	constructor( scheme?: 'EPSG:4326' | 'EPSG:3857' );

	readonly scheme: string;
	readonly tileCountX: number;
	readonly tileCountY: number;

	get isMercator(): boolean;

	setScheme( scheme: 'EPSG:4326' | 'EPSG:3857' ): void;

	convertProjectionToLatitude( v: number ): number;
	convertProjectionToLongitude( v: number ): number;
	convertLatitudeToProjection( lat: number ): number;
	convertLongitudeToProjection( lon: number ): number;

	getLongitudeDerivativeAtProjection( value: number ): number;
	getLatitudeDerivativeAtProjection( value: number ): number;

}
