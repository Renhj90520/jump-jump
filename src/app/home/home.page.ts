import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { fromEvent, interval } from 'rxjs';
import * as TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import { switchMapTo, takeUntil } from 'rxjs/operators';
import * as Hammer from 'hammerjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('mask') mask: ElementRef;
  constructor() {}

  scene;
  camera;
  renderer;
  isPlaying = false;

  startStream;
  stopStream;
  intervalStream;

  btnText = '开始游戏';

  currPressure = 1;
  jumperY;
  jumperHeight;

  ionViewDidEnter() {
    this.setupThree();
    this.setupScene();
    this.animate();
    const hammer = new Hammer(this.canvas.nativeElement, {});
    // let pressGesture: any = createGesture({
    //   el: this.canvas.nativeElement,
    //   gestureName: 'my-gesture',
    // });

    this.startStream = fromEvent(hammer, 'press'); // 'press'
    this.stopStream = fromEvent(hammer, 'pressup'); // 'pressup'

    this.intervalStream = interval(150).pipe(takeUntil(this.stopStream));

    let shrink = { scale: 1 };
    let shrinkDownTween = new TWEEN.Tween(shrink);
    shrinkDownTween.to({ scale: 0.6 }, 1000);
    shrinkDownTween.onUpdate((s) => {
      this.jumper.scale.y = s.scale;
    });

    const shrinkUpTween = new TWEEN.Tween(shrink);
    shrinkUpTween.to({ scale: 1 }, 100);
    shrinkUpTween.onUpdate((s) => {
      this.jumper.scale.y = s.scale;
    });
    this.startStream.subscribe(() => {
      shrinkDownTween.start();
    });
    this.startStream.pipe(switchMapTo(this.intervalStream)).subscribe(() => {
      this.currPressure++;
    });
    this.stopStream.subscribe(() => {
      this.jump(this.currPressure, shrinkUpTween);
      this.currPressure = 1;
      this.prevX = 0;
      this.prevY = 0;
    });
  }
  prevX = 0;
  prevY = 0;
  jump(distance, shrinkUp) {
    let firstMove = { x: 0, y: 0 };
    let firsthalfTween = new TWEEN.Tween(firstMove);
    firsthalfTween.to({ x: distance / 2, y: 5 }, 300);
    firsthalfTween.easing(TWEEN.Easing.Sinusoidal.Out);
    firsthalfTween.onUpdate((m) => {
      if (this.direRight) {
        this.jumper.position.x += m.x - this.prevX;
      } else {
        this.jumper.position.z -= m.x - this.prevX;
      }
      this.jumper.position.y += m.y - this.prevY;
      this.prevX = m.x;
      this.prevY = m.y;
    });

    shrinkUp.chain(firsthalfTween);

    let rotate = { r: 0 };
    let rotateTween = new TWEEN.Tween(rotate);
    rotateTween.to({ r: -Math.PI }, 100);
    rotateTween.onUpdate((r) => {
      this.jumper.rotation.z = r.r;
    });

    let secondMove = { x: distance / 2, y: 5 };
    let secondHalfTween = new TWEEN.Tween(secondMove);
    secondHalfTween.to({ x: distance, y: 0 }, 300);
    secondHalfTween.easing(TWEEN.Easing.Sinusoidal.In);
    secondHalfTween.onUpdate((m) => {
      if (this.direRight) {
        this.jumper.position.x += m.x - this.prevX;
      } else {
        this.jumper.position.z -= m.x - this.prevX;
      }
      this.jumper.position.y += m.y - this.prevY;
      this.prevX = m.x;
      this.prevY = m.y;
    });

    firsthalfTween.chain(rotateTween);
    rotateTween.chain(secondHalfTween);
    shrinkUp.start();
    secondHalfTween.onComplete(() => {
      this.checkBorder();
    });
  }
  direRight = true;
  checkBorder() {
    let springNext = this.springs[this.springs.length - 1];
    // let jumperSize = this.jumper.geometry.boundingSphere.radius;
    let springNextSize = springNext.geometry.boundingSphere.radius;

    let jumperLeft = this.jumper.position.x;
    let jumperRight = this.jumper.position.x;
    let jumperTop = this.jumper.position.z;
    let jumperBottom = this.jumper.position.z;

    let springNextLeft = springNext.position.x - springNextSize;
    let springNextRight = springNext.position.x + springNextSize;
    let springNextTop = springNext.position.z - springNextSize;
    let springNextBottom = springNext.position.z + springNextSize;

    let spring = this.springs[this.springs.length - 2];
    let springSize = spring.geometry.boundingSphere.radius;
    let springLeft = spring.position.x - springSize;
    let springRight = spring.position.x + springSize;
    let springTop = spring.position.z - springSize;
    let springBottom = spring.position.z + springSize;

    let isOut = false;
    if (
      jumperLeft < springLeft ||
      jumperRight > springRight ||
      jumperTop < springTop ||
      jumperBottom > springBottom
    ) {
      isOut = true;
    }
    if (isOut) {
      let isDrop = false;
      if (jumperLeft < springNextLeft) {
        this.drop('left', 1);
        isDrop = true;
      } else if (jumperRight > springNextRight) {
        this.drop('right', 1);
        isDrop = true;
      } else if (jumperTop < springNextTop) {
        this.drop('top', 1);
        isDrop = true;
      } else if (jumperBottom > springNextBottom) {
        this.drop('bottom', 1);
        isDrop = true;
      }

      if (isDrop) {
        setTimeout(() => {
          this.isPlaying = false;
          this.mask.nativeElement.className = '';
          this.btnText = '重新开始';
          this.direRight = true;
        }, 500);
      } else {
        let distance = this.maxDistance * Math.random() + 5;
        let prevPosition = this.springs[this.springs.length - 1].position;

        this.direRight = Math.floor(Math.random() * 10) % 2 === 0;
        let nextPosition = new THREE.Vector3();
        if (this.direRight) {
          nextPosition.x = prevPosition.x + distance;
          nextPosition.y = prevPosition.y;
          nextPosition.z = prevPosition.z;
        } else {
          nextPosition.x = prevPosition.x;
          nextPosition.y = prevPosition.y;
          nextPosition.z = prevPosition.z - distance;
        }
        this.addSpring(nextPosition);
        this.moveCamera();
      }
    }
  }
  cameraPrevX = 0;
  cameraPrevZ = 0;
  moveCamera() {
    let first = this.springs[this.springs.length - 1].position;
    let second = this.springs[this.springs.length - 2].position;
    let x = (first.x + second.x) / 2;
    let z = (first.z + second.z) / 2;
    if (z === 0) {
      z += 8;
    }
    x -= 8;
    if (z < 0) {
      z += 8;
    }
    let cameraPos = { x: this.camera.position.x, z: this.camera.position.z };
    let cameraTween = new TWEEN.Tween(cameraPos);
    cameraTween.to({ x: x, z: z }, 500);
    cameraTween.onUpdate((d) => {
      this.camera.position.x = d.x;
      this.camera.position.z = d.z;
      this.spotLight.position.x = d.x;
      this.spotLight.position.z = d.z;
      this.spotLight.target = this.springs[this.springs.length - 1];
    });
    cameraTween.start();
  }
  drop(direction, distance) {
    switch (direction) {
      case 'left':
        this.jumper.rotation.z = Math.PI / 2;
        break;
      case 'right':
        this.jumper.rotation.z = -Math.PI / 2;
        break;
      case 'top':
        this.jumper.rotation.x = Math.PI / 2;
        break;
      case 'bottom':
        this.jumper.rotation.x = -Math.PI / 2;
        break;
    }
    this.jumper.position.y = 0.25;
  }

  setupThree() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(0xffd2d2);
    this.renderer.setSize(
      this.canvas.nativeElement.clientWidth,
      this.canvas.nativeElement.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.canvas.nativeElement.appendChild(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0, 100);

    this.camera.lookAt(this.scene.position);
  }
  setupScene() {
    // var axesHelper = new THREE.AxesHelper(200);
    // this.scene.add(axesHelper);
    this.addPlane();
    this.initSprings();
    this.addSpotlight();
    this.addJumper();
  }
  jumper: THREE.Mesh;
  addJumper() {
    let jumperGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    let jumperMaterial = new THREE.MeshLambertMaterial({ color: 0xc5e514 });
    this.jumper = new THREE.Mesh(jumperGeo, jumperMaterial);
    this.jumper.position.set(-5, 1.6, 0);
    this.jumperY = this.jumper.position.y;
    this.jumperHeight = 1;
    this.scene.add(this.jumper);
  }

  maxDistance = 6;
  initSprings() {
    let initDirection = new THREE.Vector3(1, 0, 0);
    let initPosition = new THREE.Vector3(-5, 0, 0);
    this.addSpring(initPosition);
    let distance = this.maxDistance * Math.random() + 5;
    let distanceVector = initDirection.normalize().multiplyScalar(distance);
    let nextPosition = initPosition.add(distanceVector);
    this.addSpring(nextPosition);
    this.camera.position.set(-8, 8, 8);
    this.camera.lookAt(this.scene.position);
  }

  addPlane() {
    var planeGeo = new THREE.PlaneGeometry(1000, 1000, 20, 20);
    var planeMaterial = new THREE.MeshLambertMaterial({ color: 0xffd2d2 });
    var plane = new THREE.Mesh(planeGeo, planeMaterial);
    plane.receiveShadow = true;

    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
  }
  spotLight;
  addSpotlight() {
    this.spotLight = new THREE.SpotLight(0xffffff);
    this.spotLight.position.set(-5, 20, 15);
    this.spotLight.intensity = 1.2;

    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.target = this.springs[1];
    this.spotLight.angle = 3;
    // var cameraHelper = new THREE.CameraHelper(this.spotLight.shadow.camera);
    // this.scene.add(cameraHelper);
    this.scene.add(this.spotLight);
  }

  geometries = [
    new THREE.BoxGeometry(3, 1, 3),
    new THREE.CylinderGeometry(3, 3, 1, 30),
    new THREE.BoxGeometry(2, 1, 2),
    new THREE.CylinderGeometry(2, 2, 1, 30),
  ];
  springs = [];
  addSpring(position) {
    let geoIndex = Math.floor(Math.random() * this.geometries.length);
    var geo = this.geometries[geoIndex].clone();
    var springMaterial = new THREE.MeshLambertMaterial({ color: 0x649563 });
    var spring = new THREE.Mesh(geo, springMaterial);
    spring.castShadow = true;
    spring.position.copy(position);
    spring.position.y = 0.5;
    this.scene.add(spring);

    this.springs.push(spring);
    if (this.springs.length > 3) {
      let trashedspring = this.springs.shift();
      this.scene.remove(trashedspring);
    }
  }
  animate() {
    this.renderer.render(this.scene, this.camera);
    TWEEN.update();

    requestAnimationFrame(() => {
      if (this.isPlaying) {
        this.animate();
      }
    });
  }
  start() {
    this.mask.nativeElement.className = 'hidden';
    if (!this.isPlaying && this.btnText === '重新开始') {
      this.isPlaying = true;
      this.restart();
    } else {
      this.isPlaying = true;
      this.animate();
    }
  }
  restart() {
    do {
      const spring = this.springs.pop();
      this.scene.remove(spring);
    } while (this.springs.length > 0);

    this.initSprings();
    this.camera.position.set(-8, 8, 8);
    this.camera.lookAt(this.scene.position);
    this.spotLight.position.set(-5, 20, 15);

    this.scene.remove(this.jumper);
    this.addJumper();
    this.animate();
  }
}
