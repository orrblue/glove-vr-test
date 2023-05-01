import * as THREE from './libs/three/three.module.js';
import { VRButton } from '../../libs/three/jsm/VRButton.js';
import { BoxLineGeometry } from '../../libs/three/jsm/BoxLineGeometry.js';
import { Stats } from '../../libs/stats.module.js';
import { OrbitControls } from '../../libs/three/jsm/OrbitControls.js';

class App
{

    constructor()
    {
        const container = document.createElement( 'div' );
        document.body.appendChild( container );

        this.clock = new THREE.Clock();

        // Create camera
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.position.set( 0, 3, 5 );

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x505050 );

        // Create lighting
        const ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
        ambientLight.intensity = 1;
        this.scene.add( ambientLight );

        const directionalLight = new THREE.DirectionalLight( 0xFFFFFF );
        directionalLight.intensity = 1;
        directionalLight.position.y = 9;
        directionalLight.position.z = 12;
        this.scene.add( directionalLight );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer( { antialis: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        container.appendChild( this.renderer.domElement );

        // Orbit Controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set( 0, 1.6, 0 );
        this.controls.update();

        // Display stats
        this.stats = new Stats();
        container.appendChild( this.stats.dom );

        this.initScene();
        this.setupVR();

        window.addEventListener('resize', this.resize.bind(this) );
        this.renderer.setAnimationLoop( this.render.bind(this) );

    }

    initScene()
    {
        // desk surface
        const deskGeometry = new THREE.BoxGeometry( 10, 0.2, 5 );
        const deskMaterial = new THREE.MeshStandardMaterial( {color: 0x202020 } );
        const desk = new THREE.Mesh( deskGeometry, deskMaterial );
        desk.position.y = 0.1;
        this.scene.add( desk );


        // Cube creation

        const cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 , 10, 10, 10);

        const blueCubeMaterial = new THREE.MeshStandardMaterial( {color: 0x0A0AFF } );
        const blueCube = new THREE.Mesh( cubeGeometry, blueCubeMaterial );
        blueCube.position.x = -2.5;
        blueCube.position.y = 2;
        this.scene.add( blueCube );

        const greenCubeMaterial = new THREE.MeshLambertMaterial( {color: 0x2FBC46 } );
        const greenCube = new THREE.Mesh( cubeGeometry, greenCubeMaterial );
        greenCube.position.y = 2;
        this.scene.add( greenCube );

        const redCubeMaterial = new THREE.MeshStandardMaterial( {color: 0xFF0000 } );
        const redCube = new THREE.Mesh( cubeGeometry, redCubeMaterial );
        redCube.position.x = 2.5;
        redCube.position.y = 2;
        this.scene.add( redCube );

    }

    resize()
    {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }

    render()
    {   
        this.stats.update();
        this.renderer.render( this.scene, this.camera );
    }

    setupVR()
    {
        this.renderer.xr.enabled = true;
        document.body.appendChild( VRButton.createButton( this.renderer ) );
        this.renderer.xr.setFramebufferScaleFactor( 2.0 ); //double xr resolution default is 1

        this.dolly = new THREE.Object3D();
        this.dolly.position.z = 8;
        this.dolly.position.y = 2;
        this.dolly.add( this.camera );
        this.scene.add( this.dolly );
        
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );

    }

}


export { App };