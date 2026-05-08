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
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0.1); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;

        this.loadingManager = new THREE.LoadingManager();
        this.progressElement = document.getElementById('progress');
        this.loadingScreen = document.getElementById('loading-screen');

        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            if (this.progressElement) this.progressElement.style.width = `${progress}%`;
        };

        this.loadingManager.onLoad = () => {
            if (this.loadingScreen) {
                this.loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                }, 1000);
            }
        };
    }

    createEnvironment() {
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        const texture = textureLoader.load('./movmjngq.png');
        texture.colorSpace = THREE.SRGBColorSpace;
        
        // Standard 360 mapping
        const geometry = new THREE.SphereGeometry(500, 64, 32);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });

        this.environment = new THREE.Mesh(geometry, material);
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
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            // Slow environmental rotation for immersion
            if (this.environment) {
                this.environment.rotation.y += 0.0005;
            }
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

new ImmersiveApp();
