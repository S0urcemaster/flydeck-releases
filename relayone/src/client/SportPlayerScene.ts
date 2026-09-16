import * as THREE from "three";
import type { SportExercise, SportPose } from "./SportPlayerData";
import { buildRig, groundHeight, type Joint, type Point, type Rig, type Segment } from "./SportPlayerRig";

const radians = (value: number) => value * Math.PI / 180;
const up = new THREE.Vector3(0, 1, 0);

export class SportPlayerScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(46, 1, .1, 30);
  private readonly bodyYaw = new THREE.Group();
  private readonly bodyTilt = new THREE.Group();
  private readonly segments: THREE.Mesh[] = [];
  private readonly joints: THREE.Group[] = [];
  private readonly dumbbells: THREE.Group[] = [];
  private viewAngleOffset = 0;
  private currentPose: SportPose;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly exercise: SportExercise) {
    this.currentPose = exercise.keyframes[0].values;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x152638);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 5); this.scene.add(key);
    const fill = new THREE.PointLight(0x73b9da, 1.3, 5); fill.position.set(-1.8, 2.6, -1.4); this.scene.add(fill);
    this.scene.add(this.bodyYaw); this.bodyYaw.add(this.bodyTilt);
    this.createRoom(); this.createFurniture();
    const rig = buildRig(exercise.keyframes[0].values, exercise.metrics);
    rig.segments.forEach((segment) => this.segments.push(this.createSegment(segment)));
    rig.joints.forEach((joint) => this.joints.push(this.createJoint(joint)));
    rig.joints.filter(({ shape }) => shape === "hand").forEach(() => this.dumbbells.push(this.createDumbbell()));
    this.resize(); this.update(exercise.keyframes[0].values);
  }

  resize = () => {
    const width = this.canvas.clientWidth; const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.render();
  };

  rotateBy(deltaPixels: number) { this.viewAngleOffset = Math.max(-Math.PI, Math.min(Math.PI, this.viewAngleOffset - deltaPixels * .008)); this.positionCamera(); this.render(); }
  resetView() { this.viewAngleOffset = 0; this.positionCamera(); this.render(); }

  update(pose: SportPose) {
    this.currentPose = pose;
    const rig = buildRig(pose, this.exercise.metrics);
    this.bodyYaw.position.set(pose.x ?? 0, groundHeight(rig, pose), pose.y ?? 0);
    this.bodyYaw.rotation.set(0, radians(pose.yaw), 0);
    this.bodyTilt.rotation.set(radians(pose.pitch), 0, radians(pose.roll), "XYZ");
    rig.segments.forEach((segment, index) => this.updateSegment(this.segments[index], segment));
    rig.joints.forEach((joint, index) => this.updateJoint(this.joints[index], joint));
    rig.joints.filter(({ shape }) => shape === "hand").forEach((joint, index) => this.updateDumbbell(this.dumbbells[index], joint));
    this.positionCamera(); this.render();
  }

  render() { this.renderer.render(this.scene, this.camera); }
  destroy() {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); }
    });
    this.renderer.dispose();
  }

  private positionCamera() {
    const distance = 3.6 * 100 / Math.max(50, Math.min(180, this.currentPose.viewZoom ?? 100));
    const angle = radians(35 - (this.currentPose.viewAngle ?? 0)) + this.viewAngleOffset;
    this.camera.position.set(Math.sin(angle) * distance, this.currentPose.viewHeight ?? 1.95, Math.cos(angle) * distance);
    this.camera.lookAt(0, .95 + distance * .085, 0);
  }

  private createSegment(segment: Segment) {
    const geometry = segment.shape === "ellipsoid" ? new THREE.SphereGeometry(1, 16, 12) : new THREE.CylinderGeometry(1, 1, 1, 10);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: segment.color, roughness: .7 }));
    this.bodyTilt.add(mesh); return mesh;
  }
  private updateSegment(mesh: THREE.Mesh, segment: Segment) {
    const from = new THREE.Vector3(...segment.start); const direction = new THREE.Vector3(...segment.end).sub(from); const length = direction.length();
    mesh.position.copy(from.addScaledVector(direction, .5));
    if (segment.normal) { const longAxis = direction.normalize(); const normalAxis = new THREE.Vector3(...segment.normal).addScaledVector(longAxis, -new THREE.Vector3(...segment.normal).dot(longAxis)).normalize(); const widthAxis = longAxis.clone().cross(normalAxis).normalize(); mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(widthAxis, longAxis, normalAxis)); }
    else mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    mesh.scale.set(segment.radius, segment.shape === "ellipsoid" ? length * .62 : length, segment.radius * (segment.profile === "foot" ? .55 : segment.shape === "ellipsoid" ? .7 : 1));
  }
  private createJoint(joint: Joint) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: joint.color, roughness: .68 })); group.add(mesh);
    if (joint.shape === "head") { const nose = new THREE.Mesh(new THREE.SphereGeometry(.0275, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: joint.color, roughness: .7, side: THREE.DoubleSide })); nose.position.set(0, .02, .115); nose.rotation.x = Math.PI / 2; group.add(nose); }
    if (joint.shape === "hand") { const thumb = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: joint.color, roughness: .68 })); thumb.name = "thumb"; group.add(thumb); }
    this.bodyTilt.add(group); return group;
  }
  private updateJoint(group: THREE.Group, joint: Joint) {
    group.position.set(...joint.point); group.quaternion.identity();
    if (joint.direction) group.quaternion.copy(axisQuaternion(joint.direction, joint.normal));
    group.rotateY(radians(joint.turn ?? 0)); group.rotateX(radians(joint.bend ?? 0));
    const mesh = group.children[0] as THREE.Mesh;
    mesh.scale.set(joint.shape === "head" ? joint.radius * .85 : joint.shape === "hand" ? joint.radius * .8 : joint.radius, joint.shape === "head" ? joint.radius * 1.2 : joint.shape === "hand" ? joint.radius * 1.25 : joint.radius, joint.shape === "head" ? joint.radius * .78 : joint.shape === "hand" ? joint.radius * .55 : joint.radius);
    mesh.position.set(0, joint.shape === "hand" ? .11 * joint.radius / .085 : 0, 0);
    const thumb = group.getObjectByName("thumb");
    if (thumb) { const scale = joint.radius / .085; thumb.position.set((joint.thumbSide ?? 1) * .06 * scale, .125 * scale, .015 * scale); thumb.scale.setScalar(.035 * scale); }
  }
  private createDumbbell() {
    const group = new THREE.Group(); group.visible = this.exercise.furniture.dumbbells;
    group.scale.setScalar(this.exercise.furniture.dumbbellSize / 100);
    const barMaterial = new THREE.MeshStandardMaterial({ color: this.exercise.furniture.dumbbellColor, roughness: .55, metalness: .35 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .3, 8), barMaterial); bar.rotation.z = Math.PI / 2; group.add(bar);
    for (const x of [-.12, .12]) { const weight = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .055, 10), new THREE.MeshStandardMaterial({ color: 0x273942, roughness: .65, metalness: .25 })); weight.position.x = x; weight.rotation.z = Math.PI / 2; group.add(weight); }
    this.bodyTilt.add(group); return group;
  }
  private updateDumbbell(group: THREE.Group, joint: Joint) { group.position.set(...joint.point); group.quaternion.copy(axisQuaternion(joint.direction!, joint.normal)); group.rotateY(radians(joint.turn ?? 0)); group.rotateX(radians(joint.bend ?? 0)); group.translateY(.125 * joint.radius / .085); }

  private createRoom() {
    this.scene.add(plane(5, 5, 0x213a4a, [-Math.PI / 2, 0, 0], [0, -.02, 0]));
    this.scene.add(plane(5, 3, 0x1a3040, [0, 0, 0], [0, 1.5, -2.5]));
    this.scene.add(plane(5, 3, 0x1d3545, [0, Math.PI / 2, 0], [-2.5, 1.5, 0]));
  }
  private createFurniture() {
    const { table, chair, bench, wallBar, plant, mat, poster } = this.exercise.furniture;
    if (table.enabled) { const group = placedGroup(table); group.add(box([table.width, .09, table.depth], table.color, [0, table.height - .045, 0])); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) group.add(box([.08, table.height - .09, .08], table.color, [x * (table.width / 2 - .09), (table.height - .09) / 2, z * (table.depth / 2 - .09)])); this.scene.add(group); }
    if (chair.enabled) { const group = placedGroup(chair); group.add(box([.52, .1, .52], chair.color, [0, .48, 0]), box([.52, .62, .08], chair.color, [0, .82, -.23])); for (const position of [[-.2, .23, -.2], [.2, .23, -.2], [-.2, .23, .2], [.2, .23, .2]] as Point[]) group.add(box([.065, .46, .065], 0x6f5545, position)); this.scene.add(group); }
    if (bench.enabled) { const group = placedGroup(bench); group.add(box([.58, .12, .72], bench.color, [0, .43, .38]), box([.42, .42, .08], 0x4a5660, [0, .21, .25])); const back = new THREE.Group(); back.position.set(0, .43, .02); back.rotation.x = radians(bench.backrest); back.add(box([.58, .12, .82], bench.color, [0, .02, -.42])); group.add(back); this.scene.add(group); }
    if (wallBar.enabled) { const group = new THREE.Group(); group.position.set(wallBar.x, wallBar.y, -2.42); group.add(box([wallBar.length, .075, .075], wallBar.color, [0, 0, .13]), box([.075, .35, .2], 0x8799a4, [-wallBar.length / 2 + .095, -.14, .06]), box([.075, .35, .2], 0x8799a4, [wallBar.length / 2 - .095, -.14, .06])); this.scene.add(group); }
    if (plant.enabled) { const group = new THREE.Group(); group.position.set(plant.x, 0, plant.y); group.add(cylinder(.22, .16, .36, 0x9a6848, [0, .18, 0]), cylinder(.025, .04, .45, 0x47775b, [0, .48, 0])); for (const [index, position] of [[-.13, .48, 0], [.12, .62, .02], [-.08, .76, -.03], [.04, .88, 0]].entries()) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), material(plant.color)); leaf.position.set(...position as Point); leaf.rotation.z = index % 2 ? -.65 : .65; leaf.scale.set(.09, .22, .045); group.add(leaf); } this.scene.add(group); }
    if (mat.enabled) { const group = placedGroup(mat); group.add(box([mat.width, .025, mat.depth], mat.color, [0, .018, 0])); this.scene.add(group); }
    if (poster.enabled) { const group = new THREE.Group(); group.position.set(-2.478, 0, poster.z); group.rotation.y = Math.PI / 2; group.add(box([poster.width, 1.02, .025], 0xd6af73, [0, poster.y, 0]), plane(Math.max(.1, poster.width - .12), .88, poster.color, [0, 0, 0], [0, poster.y, .018])); this.scene.add(group); }
  }
}

function axisQuaternion(direction: Point, normal?: Point) {
  const longAxis = new THREE.Vector3(...direction).normalize(); const crossAxis = normal ? new THREE.Vector3(...normal).addScaledVector(longAxis, -new THREE.Vector3(...normal).dot(longAxis)) : new THREE.Vector3(1, 0, 0).addScaledVector(longAxis, -longAxis.x);
  if (crossAxis.lengthSq() < .000001) crossAxis.set(0, 0, 1); crossAxis.normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(crossAxis, longAxis, crossAxis.clone().cross(longAxis).normalize()));
}
function material(color: THREE.ColorRepresentation) { return new THREE.MeshStandardMaterial({ color, roughness: .85 }); }
function box(size: Point, color: THREE.ColorRepresentation, position: Point) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color)); mesh.position.set(...position); return mesh; }
function plane(width: number, height: number, color: THREE.ColorRepresentation, rotation: Point, position: Point) { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material(color)); mesh.rotation.set(...rotation); mesh.position.set(...position); return mesh; }
function cylinder(top: number, bottom: number, height: number, color: number, position: Point) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 12), material(color)); mesh.position.set(...position); return mesh; }
function placedGroup(item: { x: number; y: number; rotation: number }) { const group = new THREE.Group(); group.position.set(item.x, 0, item.y); group.rotation.y = radians(item.rotation); return group; }
