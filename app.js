import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

class ImmersiveApp {
    constructor() {
        this.init();
        this.createEnvironment();
        this.loadCharacter();
        this.setupXR();
        this.addEventListeners();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 3, 6); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 15;
        this.controls.enablePan = false;
        
        this.keys = { w: false, a: false, s: false, d: false };
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.05;

        // Animation State
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;

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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7.5);
        this.scene.add(dirLight);
    }

    createEnvironment() {
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        const texture = textureLoader.load('./movmjngq.png');
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        const sphereGeo = new THREE.SphereGeometry(500, 64, 32);
        const sphereMat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });

        this.environment = new THREE.Mesh(sphereGeo, sphereMat);
        this.scene.add(this.environment);
    }

    loadCharacter() {
        const loader = new GLTFLoader(this.loadingManager);
        const modelPath = './96aafe422795b65eb2f93e5ce46da1f4.glb';

        loader.load(modelPath, (gltf) => {
            this.character = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(this.character);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            this.character.position.x += (this.character.position.x - center.x);
            this.character.position.y += (this.character.position.y - center.y);
            this.character.position.z += (this.character.position.z - center.z);

            const scale = 1.7 / size.y;
            this.character.scale.setScalar(scale);
            this.character.position.y = 0;
            this.scene.add(this.character);
            
            // Setup Animations
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.character);
                
                gltf.animations.forEach((clip, index) => {
                    // Try to find idle and walk by name, otherwise fallback to index
                    let name = clip.name.toLowerCase();
                    if (name.includes('idle')) name = 'idle';
                    else if (name.includes('walk') || name.includes('run')) name = 'walk';
                    else name = index === 0 ? 'idle' : 'walk';

                    const action = this.mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat); // Ensure it loops
                    action.clampWhenFinished = false; // Don't stop at end
                    this.actions[name] = action;
                });

                // Set initial action
                this.activeAction = this.actions['idle'] || Object.values(this.actions)[0];
                if (this.activeAction) this.activeAction.play();
            }
        });
    }

    fadeToAction(name, duration = 0.5) {
        const nextAction = this.actions[name];
        if (nextAction && nextAction !== this.activeAction) {
            const prevAction = this.activeAction;
            this.activeAction = nextAction;

            if (prevAction) {
                prevAction.fadeOut(duration);
            }

            this.activeAction
                .reset()
                .setEffectiveTimeScale(1)
                .setEffectiveWeight(1)
                .fadeIn(duration)
                .play();
        }
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

    updateThirdPerson() {
        if (!this.character) return;

        const direction = new THREE.Vector3();
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        if (this.keys.w) direction.add(forward);
        if (this.keys.s) direction.sub(forward);
        if (this.keys.a) direction.sub(right);
        if (this.keys.d) direction.add(right);

        if (direction.length() > 0) {
            direction.normalize();
            
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
            this.character.quaternion.slerp(targetQuaternion, this.rotationSpeed);
            
            this.character.position.addScaledVector(direction, this.moveSpeed);
            
            if (this.character.position.length() > 450) {
                this.character.position.setLength(450);
            }

            // Switch to walk animation if moving
            if (this.actions['walk']) this.fadeToAction('walk');
            else if (Object.keys(this.actions).length > 1) {
                // If 'walk' isn't explicitly found, try the second animation
                const names = Object.keys(this.actions);
                this.fadeToAction(names[1]);
            }
        } else {
            // Switch back to idle if stopped
            if (this.actions['idle']) this.fadeToAction('idle');
            else if (Object.keys(this.actions).length > 0) {
                // If 'idle' isn't explicitly found, try the first animation
                const names = Object.keys(this.actions);
                this.fadeToAction(names[0]);
            }
        }

        const charPos = this.character.position.clone();
        charPos.y += 1.6; 
        
        const delta = charPos.clone().sub(this.controls.target);
        this.camera.position.add(delta);
        this.controls.target.copy(charPos);
    }

    animate() {
        const clock = new THREE.Clock();
        this.renderer.setAnimationLoop(() => {
            const delta = clock.getDelta();
            if (this.mixer) this.mixer.update(delta);
            
            this.updateThirdPerson();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

new ImmersiveApp();
