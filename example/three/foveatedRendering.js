import {
	TilesRenderer,
	EnvironmentControls,
} from '3d-tiles-renderer';
import {
	DebugTilesPlugin,
	FoveatedRenderingPlugin,
	ImplicitTilingPlugin,
	GLTFExtensionsPlugin,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	Sphere,
	MeshBasicMaterial,
	SphereGeometry,
	Mesh,
	Color,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles;
let foveatedPlugin, debugPlugin;
let stats;

const params = {

	enableFoveation: true,
	foveationConeFactor: 0.1,
	enableDeferral: true,

	errorTarget: 6,
	maxDepth: 15,
	loadSiblings: true,
	displayActiveTiles: false,

	enableDebug: true,
	displayBoxBounds: false,
	displaySphereBounds: false,
	colorMode: DebugTilesPlugin.ColorModes.NONE,

	reload: reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	const url = hashUrl || '../data/tileset.json';

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();

	}

	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const ktx2loader = new KTX2Loader();
	ktx2loader.setTranscoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/' );
	ktx2loader.detectSupport( renderer );

	tiles = new TilesRenderer( url );
	tiles.registerPlugin( new ImplicitTilingPlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		rtc: true,
		dracoLoader: dracoLoader,
		ktxLoader: ktx2loader,
	} ) );

	// Register foveated rendering plugin
	foveatedPlugin = new FoveatedRenderingPlugin( {
		foveationConeFactor: params.foveationConeFactor,
		enableDeferral: params.enableDeferral,
	} );

	if ( params.enableFoveation ) {

		tiles.registerPlugin( foveatedPlugin );

	}

	// Register debug plugin for visualization
	debugPlugin = new DebugTilesPlugin();
	tiles.registerPlugin( debugPlugin );

	tiles.fetchOptions.mode = 'cors';
	tiles.errorTarget = params.errorTarget;
	tiles.maxDepth = params.maxDepth;
	tiles.loadSiblings = params.loadSiblings;
	tiles.displayActiveTiles = params.displayActiveTiles;

	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// Update tile set when loaded
	tiles.addEventListener( 'load-tileset', () => {

		const sphere = new Sphere();
		tiles.getBoundingSphere( sphere );

		const position = sphere.center.clone();
		const distanceToEllipsoidCenter = position.length();

		const surfaceDirection = position.normalize();
		const up = new THREE.Vector3( 0, 1, 0 );
		const rotationToNorthPole = up.angleTo( surfaceDirection );

		tiles.group.rotation.x = rotationToNorthPole;

	} );

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100000 );
	camera.position.set( 400, 400, 400 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.adjustHeight = false;

	// lights
	const dirLight = new DirectionalLight( 0xffffff, 1 );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	reinstantiateTiles();
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const foveationFolder = gui.addFolder( 'Foveated Rendering' );
	foveationFolder.add( params, 'enableFoveation' ).onChange( v => {

		if ( v && ! tiles.getPluginByName( 'FOVEATED_RENDERING_PLUGIN' ) ) {

			tiles.registerPlugin( foveatedPlugin );

		} else if ( ! v && tiles.getPluginByName( 'FOVEATED_RENDERING_PLUGIN' ) ) {

			tiles.unregisterPlugin( foveatedPlugin );

		}

	} );
	foveationFolder.add( params, 'foveationConeFactor', 0, 1, 0.01 ).onChange( v => {

		if ( foveatedPlugin ) {

			foveatedPlugin.foveationConeFactor = v;

		}

	} );
	foveationFolder.add( params, 'enableDeferral' ).onChange( v => {

		if ( foveatedPlugin ) {

			foveatedPlugin.enableDeferral = v;

		}

	} );
	foveationFolder.open();

	const renderFolder = gui.addFolder( 'Tiles Options' );
	renderFolder.add( params, 'errorTarget', 0, 100 ).onChange( v => {

		tiles.errorTarget = v;

	} );
	renderFolder.add( params, 'maxDepth', 1, 100 ).onChange( v => {

		tiles.maxDepth = v;

	} );
	renderFolder.add( params, 'loadSiblings' ).onChange( v => {

		tiles.loadSiblings = v;

	} );
	renderFolder.add( params, 'displayActiveTiles' ).onChange( v => {

		tiles.displayActiveTiles = v;

	} );

	const debugFolder = gui.addFolder( 'Debug' );
	debugFolder.add( params, 'enableDebug' ).onChange( v => {

		debugPlugin.displayBoxBounds = v && params.displayBoxBounds;
		debugPlugin.displaySphereBounds = v && params.displaySphereBounds;
		debugPlugin.colorMode = v ? params.colorMode : DebugTilesPlugin.ColorModes.NONE;

	} );
	debugFolder.add( params, 'displayBoxBounds' ).onChange( v => {

		debugPlugin.displayBoxBounds = v && params.enableDebug;

	} );
	debugFolder.add( params, 'displaySphereBounds' ).onChange( v => {

		debugPlugin.displaySphereBounds = v && params.enableDebug;

	} );
	const colorModeOptions = {};
	for ( const key in DebugTilesPlugin.ColorModes ) {

		colorModeOptions[ key ] = DebugTilesPlugin.ColorModes[ key ];

	}
	debugFolder.add( params, 'colorMode', colorModeOptions ).onChange( v => {

		debugPlugin.colorMode = params.enableDebug ? v : DebugTilesPlugin.ColorModes.NONE;

	} );

	gui.add( params, 'reload' );

	// stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

	tiles.setResolutionFromRenderer( camera, renderer );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	stats.begin();

	controls.update();

	// Update tiles
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );

	stats.end();

}
