import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

class ImmersiveApp {
    constructor() {
        this.init();
        this.createEnvironment();
        this.setupXR();
        this.addEventListeners();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222); // Gray background to confirm rendering

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 10); 

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        
        // Movement State
        this.keys = { w: false, a: false, s: false, d: false };
        this.moveSpeed = 0.2;

        // UI Elements
        this.progressElement = document.getElementById('progress');
        this.loadingScreen = document.getElementById('loading-screen');

        // Loading Manager
        this.loadingManager = new THREE.LoadingManager();
        
        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            if (this.progressElement) {
                this.progressElement.style.width = `${progress}%`;
            }
            console.log(`Loading: ${progress}%`);
        };

        this.loadingManager.onLoad = () => {
            console.log('All assets loaded!');
            if (this.loadingScreen) {
                this.loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                }, 1000);
            }
        };

        this.loadingManager.onError = (url) => {
            console.error('Error loading:', url);
            // Even on error, hide the loading screen so we can see the fallback
            if (this.loadingScreen) this.loadingScreen.style.display = 'none';
        };

        // Add a fallback red cube to verify rendering is working
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.cube = new THREE.Mesh(boxGeo, boxMat);
        this.scene.add(this.cube);
    }

    createEnvironment() {
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        
        // In Vite, if movmjngq.png is in the same directory as app.js (root), 
        // we should reference it correctly.
        const texture = textureLoader.load('./movmjngq.png');
        texture.colorSpace = THREE.SRGBColorSpace;

        // Massive Sphere
        const sphereGeo = new THREE.SphereGeometry(500, 64, 32);
        const sphereMat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });

        this.environment = new THREE.Mesh(sphereGeo, sphereMat);
        this.scene.add(this.environment);
    }

    setupXR() {
        const container = document.getElementById('webxr-container');
        if (container) {
            container.appendChild(VRButton.createButton(this.renderer));
            container.appendChild(ARButton.createButton(this.renderer));
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
    }

    updateMovement() {
        const direction = new THREE.Vector3();
        const frontVector = new THREE.Vector3();
        const sideVector = new THREE.Vector3();

        this.camera.getWorldDirection(frontVector);
        frontVector.y = 0;
        frontVector.normalize();

        sideVector.crossVectors(this.camera.up, frontVector).normalize();

        if (this.keys.w) direction.add(frontVector);
        if (this.keys.s) direction.sub(frontVector);
        if (this.keys.a) direction.add(sideVector);
        if (this.keys.d) direction.sub(sideVector);

        if (direction.length() > 0) {
            direction.normalize().multiplyScalar(this.moveSpeed);
            this.camera.position.add(direction);
            this.controls.target.add(direction);
        }
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            if (this.cube) {
                this.cube.rotation.x += 0.01;
                this.cube.rotation.y += 0.01;
            }
            this.updateMovement();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

new ImmersiveApp();
