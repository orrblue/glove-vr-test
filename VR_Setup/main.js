import * as THREE from './libs/three/three.module.js';
import { VRButton } from './libs/three/jsm/VRButton.js';
import { XRControllerModelFactory } from '../../libs/three/jsm/XRControllerModelFactory.js';
import { Stats } from './libs/stats.module.js';
import { OrbitControls } from './libs/three/jsm/OrbitControls.js';
import { CannonHelper } from './libs/CannonHelper.js';

class App
{

    constructor()
    {
        const container = document.createElement( 'div' );
        document.body.appendChild( container );

        this.clock = new THREE.Clock();

        // Create camera
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.position.set( 0, 2, 2 );

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

        this.renderer.setAnimationLoop( this.render.bind(this) );

        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.origin = new THREE.Vector3();

        window.addEventListener('resize', this.resize.bind(this) );

    }

    initScene()
    {
        // desk surface
        const deskGeometry = new THREE.BoxGeometry( 10, 0.2, 5 );
        const deskMaterial = new THREE.MeshStandardMaterial( {color: 0x202020 } );
        const desk = new THREE.Mesh( deskGeometry, deskMaterial );
        desk.position.y = 0.1;
        //this.scene.add( desk );


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

        const geometry = new THREE.SphereBufferGeometry( 0.1, 8, 8 );
        const material = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
        this.marker = new THREE.Mesh( geometry, material );
        this.marker.visible = false;
        this.scene.add(this.marker);

        this.initPhysics();

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
        if (this.renderer.xr.isPresenting) this.handleController( this.controller );
        if (this.world) this.world.step(this.dt);
        if (this.helper) this.helper.update();
        this.renderer.render( this.scene, this.camera );
    }

    setupVR()
    {
        this.renderer.xr.enabled = true;
        document.body.appendChild( VRButton.createButton( this.renderer ) );

        this.dolly = new THREE.Object3D();
        this.dolly.position.z = 5;
        this.dolly.position.y = 2;
        this.dolly.add( this.camera );
        this.scene.add( this.dolly );
        
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );

        const self = this;
        
        function onSelectStart() {
            
            this.userData.selectPressed = true;
            if (this.userData.selected){
                self.addConstraint( self.marker.getWorldPosition( self.origin ), self.box );
                self.controller.attach( self.marker );
            }
        }

        function onSelectEnd() {

            this.userData.selectPressed = false;
            const constraint = self.controller.userData.constraint;
            if (constraint){
                self.world.removeConstraint(constraint);
                self.controller.userData.constraint = undefined;
                self.scene.add( self.marker );
                self.marker.visible = false;
            }
            
        }
        
        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'selectstart', onSelectStart );
        this.controller.addEventListener( 'selectend', onSelectEnd );
        this.controller.addEventListener( 'connected', function ( event ) {

            const mesh = self.buildController.call(self, event.data );
            mesh.scale.z = 0;
            this.add( mesh );

        } );
        this.controller.addEventListener( 'disconnected', function () {

            this.remove( this.children[ 0 ] );
            self.controller = null;
            self.controllerGrip = null;

        } );
        this.scene.add( this.controller );

        const controllerModelFactory = new XRControllerModelFactory();

        this.controllerGrip = this.renderer.xr.getControllerGrip( 0 );
        this.controllerGrip.add( controllerModelFactory.createControllerModel( this.controllerGrip ) );
        this.scene.add( this.controllerGrip );

    }

    buildController( data )
    {
        let geometry, material;
        
        switch ( data.targetRayMode ) {
            
            case 'tracked-pointer':

                geometry = new THREE.BufferGeometry();
                geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
                geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

                material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

                return new THREE.Line( geometry, material );

            case 'gaze':

                geometry = new THREE.RingBufferGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
                material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
                return new THREE.Mesh( geometry, material );

        }

    }

    handleController( controller )
    {
        if (!controller.userData.selectPressed){
            controller.children[0].scale.z = 10;

            this.workingMatrix.identity().extractRotation( controller.matrixWorld );

            this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
            this.raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( this.workingMatrix );

            const intersects = this.raycaster.intersectObject( this.box.threemesh.children[0] );

            if (intersects.length>0){
                this.marker.position.copy(intersects[0].point);
                this.marker.visible = true;
                controller.children[0].scale.z = intersects[0].distance;
                controller.userData.selected = true;
            }else{
                this.marker.visible = false;
                controller.userData.selected = false;
            }
        }else{
            const constraint = controller.userData.constraint;
            if (constraint){
                this.jointBody.position.copy( this.marker.getWorldPosition( this.origin ) );
                constraint.update(); 
            }
        }
    }

    initPhysics()
    {
        this.world = new CANNON.World();
		
        this.dt = 1.0/60.0;
	    this.damping = 0.01;
		
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.gravity.set(0, -10, 0);
  
        this.helper = new CannonHelper( this.scene, this.world );
		
        const groundShape = new CANNON.Plane();
        //const groundMaterial = new CANNON.Material();
        const groundBody = new CANNON.Body({ mass: 0 });//, material: groundMaterial });
        groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), -Math.PI/2);
        groundBody.addShape(groundShape);
        this.world.add(groundBody);
        this.helper.addVisual(groundBody, 0xffaa00);

        // Joint body
        const shape = new CANNON.Sphere(0.1);
        this.jointBody = new CANNON.Body({ mass: 0 });
        this.jointBody.addShape(shape);
        this.jointBody.collisionFilterGroup = 0;
        this.jointBody.collisionFilterMask = 0;
        this.world.add(this.jointBody);

        this.box = this.addBody();

    }

    addBody(box=true)
    {
        let shape;
        if (!box){
            shape = new CANNON.Sphere(0.5);
        }else{
            shape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
        }
        const material = new CANNON.Material();
        const body = new CANNON.Body({ mass: 5, material: material });
        body.addShape(shape);

        body.position.set(0, 1, 1);
        body.linearDamping = this.damping;
        this.world.add(body);

        this.helper.addVisual(body);

        return body;
    }

    addConstraint(pos, body)
    {
        const pivot = pos.clone();
        body.threemesh.worldToLocal(pivot);
        
        this.jointBody.position.copy(pos);
 
        const constraint = new CANNON.PointToPointConstraint(body, pivot, this.jointBody, new CANNON.Vec3(0,0,0));

        this.world.addConstraint(constraint);
        
        this.controller.userData.constraint = constraint;
    }



}


export { App };