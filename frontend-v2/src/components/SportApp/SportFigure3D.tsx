import { memo, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { DoubleSide, Matrix4, Quaternion, Vector3 } from "three";
import { Base, type BaseStyleProps } from "../Base";
import { buildSportRig, groundedSportFigureHeight, type RigJoint, type RigPoint, type RigSegment } from "./SportRig";
import { defaultSportMetrics, type SportMetricValues } from "./SportMetrics";
import { defaultSportCamera, sportCameraView, type SportCameraControls } from "./SportCamera";
import { defaultSportFurniture, type SportFurniture } from "./SportExercise";
import styles from "./SportApp.module.css";

type Pose = Record<string, number>;
const degrees = (value: number) => value * Math.PI / 180;

function Segment({ start, end, color, radius, shape, profile, normal }: RigSegment) {
  const transform = useMemo(() => {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      position: from.add(to).multiplyScalar(.5).toArray() as RigPoint,
      length: direction.length(),
      rotation: normal ? (() => {
        const longAxis = direction.normalize();
        const normalAxis = new Vector3(...normal).addScaledVector(longAxis, -new Vector3(...normal).dot(longAxis)).normalize();
        const widthAxis = longAxis.clone().cross(normalAxis).normalize();
        return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(widthAxis, longAxis, normalAxis));
      })() : new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    };
  }, [start, end, normal]);
  return <mesh position={transform.position} quaternion={transform.rotation} scale={shape === "ellipsoid" ? [radius, transform.length * .62, radius * (profile === "foot" ? .55 : .7)] : [radius, transform.length, radius]}>
    {shape === "ellipsoid"
      ? <sphereGeometry args={[1, 20, 14]} />
      : <cylinderGeometry args={[1, 1, 1, 10]} />}
    <meshStandardMaterial color={color} roughness={.7} />
  </mesh>;
}

function Joint({ point, color, radius, shape, direction, normal, turn = 0, bend = 0, thumbSide = 1 }: RigJoint) {
  const rotation = useMemo(() => {
    if (!direction) return undefined;
    const longAxis = new Vector3(...direction).normalize();
    const hingeAxis = normal ? new Vector3(...normal).addScaledVector(longAxis, -new Vector3(...normal).dot(longAxis)) : new Vector3(1, 0, 0).addScaledVector(longAxis, -longAxis.x);
    if (hingeAxis.lengthSq() < .000001) hingeAxis.set(0, 0, 1);
    hingeAxis.normalize();
    const frontAxis = hingeAxis.clone().cross(longAxis).normalize();
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(hingeAxis, longAxis, frontAxis));
  }, [direction, normal]);
  const scale: RigPoint = shape === "head"
    ? [radius * .85, radius * 1.2, radius * .78]
    : shape === "hand" ? [radius * .8, radius * 1.25, radius * .55] : [radius, radius, radius];
  const detailScale = radius / (shape === "head" ? .15 : .085);
  return <group position={point} quaternion={rotation}>
    <group rotation={[0, degrees(turn), 0]}>
      <group rotation={[degrees(bend), 0, 0]}>
        <mesh position={shape === "hand" ? [0, .11 * detailScale, 0] : [0, 0, 0]} scale={scale}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>
        {shape === "head" ? <mesh position={[0, .02 * detailScale, .115 * detailScale]} rotation={[Math.PI / 2, 0, 0]} scale={detailScale}><sphereGeometry args={[.0275, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={.7} side={DoubleSide} /></mesh> : null}
        {shape === "hand" ? <mesh position={[thumbSide * .06 * detailScale, .125 * detailScale, .015 * detailScale]} scale={[.035 * detailScale, .045 * detailScale, .03 * detailScale]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={color} roughness={.65} /></mesh> : null}
      </group>
    </group>
  </group>;
}

function EditorCamera({ controls }: { controls: SportCameraControls }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const view = sportCameraView(controls);
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    invalidate();
  }, [camera, controls, invalidate]);
  return null;
}

const SportRoom = memo(function SportRoom() {
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]}><planeGeometry args={[5, 5]} /><meshStandardMaterial color="#213a4a" roughness={1} /></mesh>
    <mesh position={[0, 1.5, -2.5]}><planeGeometry args={[5, 3]} /><meshStandardMaterial color="#1a3040" roughness={1} /></mesh>
    <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.5, 1.5, 0]}><planeGeometry args={[5, 3]} /><meshStandardMaterial color="#1d3545" roughness={1} /></mesh>
    <gridHelper args={[5, 12, "#3c6278", "#3c6278"]} position={[0, 0, 0]} />
    <mesh position={[0, 2.15, -2.48]}><boxGeometry args={[3.7, .012, .012]} /><meshBasicMaterial color="#527e99" /></mesh>
    <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.48, 2.15, 0]}><boxGeometry args={[3.7, .012, .012]} /><meshBasicMaterial color="#527e99" /></mesh>
    <group position={[-2.5, 0, -2.5]}>
      <mesh position={[2.5, .012, 0]}><boxGeometry args={[5, .025, .025]} /><meshBasicMaterial color="#557b91" /></mesh>
      <mesh position={[0, .012, 2.5]}><boxGeometry args={[.025, .025, 5]} /><meshBasicMaterial color="#557b91" /></mesh>
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[.025, 3, .025]} /><meshBasicMaterial color="#557b91" /></mesh>
    </group>
  </>;
});

const SportFurnitureScene = memo(function SportFurnitureScene({ furniture }: { furniture: SportFurniture }) {
  const table = furniture.table;
  const chair = furniture.chair;
  const bench = furniture.bench;
  return <>
    {table.enabled ? <group position={[table.x, 0, table.y]} rotation={[0, degrees(table.rotation), 0]}>
      <mesh position={[0, table.height - .045, 0]}><boxGeometry args={[table.width, .09, table.depth]} /><meshStandardMaterial color={table.color} roughness={.82} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], index) => <mesh key={index} position={[x * (table.width / 2 - .09), (table.height - .09) / 2, z * (table.depth / 2 - .09)]}><boxGeometry args={[.08, table.height - .09, .08]} /><meshStandardMaterial color={table.color} roughness={.88} /></mesh>)}
    </group> : null}
    {chair.enabled ? <group position={[chair.x, 0, chair.y]} rotation={[0, degrees(chair.rotation), 0]}>
      <mesh position={[0, .48, 0]}><boxGeometry args={[.52, .1, .52]} /><meshStandardMaterial color={chair.color} roughness={.86} /></mesh>
      <mesh position={[0, .82, -.23]}><boxGeometry args={[.52, .62, .08]} /><meshStandardMaterial color={chair.color} roughness={.86} /></mesh>
      {[[-.2, .23, -.2], [.2, .23, -.2], [-.2, .23, .2], [.2, .23, .2]].map((position, index) => <mesh key={index} position={position as RigPoint}><boxGeometry args={[.065, .46, .065]} /><meshStandardMaterial color="#6f5545" roughness={.88} /></mesh>)}
    </group> : null}
    {bench.enabled ? <group position={[bench.x, 0, bench.y]} rotation={[0, degrees(bench.rotation), 0]}>
      <mesh position={[0, .43, .38]}><boxGeometry args={[.58, .12, .72]} /><meshStandardMaterial color={bench.color} roughness={.8} /></mesh>
      <group position={[0, .43, .02]} rotation={[degrees(bench.backrest), 0, 0]}><mesh position={[0, .02, -.42]}><boxGeometry args={[.58, .12, .82]} /><meshStandardMaterial color={bench.color} roughness={.8} /></mesh></group>
      <mesh position={[0, .21, .25]}><boxGeometry args={[.42, .42, .08]} /><meshStandardMaterial color="#4a5660" roughness={.9} /></mesh>
      <mesh position={[0, .12, -.45]}><boxGeometry args={[.72, .08, .08]} /><meshStandardMaterial color="#4a5660" roughness={.9} /></mesh>
    </group> : null}
    {furniture.wallBar.enabled ? <group position={[furniture.wallBar.x, furniture.wallBar.y, -2.42]}>
      <mesh position={[0, 0, .13]}><boxGeometry args={[furniture.wallBar.length, .075, .075]} /><meshStandardMaterial color={furniture.wallBar.color} roughness={.7} /></mesh>
      <mesh position={[-furniture.wallBar.length / 2 + .095, -.14, .06]}><boxGeometry args={[.075, .35, .2]} /><meshStandardMaterial color="#8799a4" roughness={.75} /></mesh>
      <mesh position={[furniture.wallBar.length / 2 - .095, -.14, .06]}><boxGeometry args={[.075, .35, .2]} /><meshStandardMaterial color="#8799a4" roughness={.75} /></mesh>
    </group> : null}
    {furniture.plant.enabled ? <group position={[furniture.plant.x, 0, furniture.plant.y]}>
      <mesh position={[0, .18, 0]}><cylinderGeometry args={[.22, .16, .36, 12]} /><meshStandardMaterial color="#9a6848" roughness={.9} /></mesh>
      <mesh position={[0, .48, 0]}><cylinderGeometry args={[.025, .04, .45, 7]} /><meshStandardMaterial color="#47775b" roughness={.85} /></mesh>
      {[[-.13, .48, 0], [.12, .62, .02], [-.08, .76, -.03], [.04, .88, 0]].map((position, index) => <mesh key={index} position={position as RigPoint} rotation={[0, 0, index % 2 ? -.65 : .65]} scale={[.09, .22, .045]}><sphereGeometry args={[1, 10, 7]} /><meshStandardMaterial color={furniture.plant.color} roughness={.82} /></mesh>)}
    </group> : null}
    {furniture.mat.enabled ? <group position={[furniture.mat.x, 0, furniture.mat.y]} rotation={[0, degrees(furniture.mat.rotation), 0]}><mesh position={[0, .018, 0]}><boxGeometry args={[furniture.mat.width, .025, furniture.mat.depth]} /><meshStandardMaterial color={furniture.mat.color} roughness={.92} /></mesh></group> : null}
    {furniture.poster.enabled ? <group position={[-2.478, 0, furniture.poster.z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, furniture.poster.y, 0]}><boxGeometry args={[furniture.poster.width, 1.02, .025]} /><meshStandardMaterial color="#d6af73" roughness={.8} /></mesh>
      <mesh position={[0, furniture.poster.y, .018]}><planeGeometry args={[Math.max(.1, furniture.poster.width - .12), .88]} /><meshBasicMaterial color={furniture.poster.color} /></mesh>
    </group> : null}
  </>;
});

function HandDumbbell({ joint, size, color }: { joint: RigJoint; size: number; color: string }) {
  const rotation = useMemo(() => {
    const longAxis = new Vector3(...joint.direction!).normalize();
    const crossAxis = new Vector3(1, 0, 0).addScaledVector(longAxis, -longAxis.x);
    if (crossAxis.lengthSq() < .000001) crossAxis.set(0, 0, 1);
    crossAxis.normalize();
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(crossAxis, longAxis, crossAxis.clone().cross(longAxis).normalize()));
  }, [joint.direction]);
  return <group position={joint.point} quaternion={rotation}><group rotation={[degrees(joint.bend ?? 0), degrees(joint.turn ?? 0), 0]}><group position={[0, .125 * joint.radius / .085, 0]} scale={size / 100}>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.022, .022, .3, 8]} /><meshStandardMaterial color={color} roughness={.55} metalness={.35} /></mesh>
    {[-.12, .12].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.07, .07, .055, 10]} /><meshStandardMaterial color="#273942" roughness={.65} metalness={.25} /></mesh>)}
  </group></group></group>;
}

export type SportFigure3DProps = BaseStyleProps & { pose: Pose; metrics?: SportMetricValues; furniture?: SportFurniture; cameraControls?: SportCameraControls; onCameraAngleChange?: (angle: number) => void; onCameraReset?: () => void };

export function SportFigure3D({ pose, metrics = defaultSportMetrics, furniture = defaultSportFurniture, cameraControls = defaultSportCamera, onCameraAngleChange, onCameraReset, ...baseProps }: SportFigure3DProps) {
  const figure = useMemo(() => buildSportRig(pose, metrics), [pose, metrics]);
  const figureHeight = groundedSportFigureHeight(figure, pose);
  const drag = useRef<{ pointerId: number; x: number; angle: number } | null>(null);
  return <Base {...baseProps} className={styles.view} componentName="SportFigure3D" role="img" aria-label="Three-dimensional joint figure. Drag horizontally to rotate the view."
    onDoubleClick={onCameraReset}
    onPointerDown={(event) => {
      drag.current = { pointerId: event.pointerId, x: event.clientX, angle: cameraControls.angle };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (drag.current?.pointerId !== event.pointerId) return;
      const angle = drag.current.angle + (event.clientX - drag.current.x) * .008 * 180 / Math.PI;
      onCameraAngleChange?.(Math.max(-180, Math.min(180, angle)));
    }}
    onPointerUp={(event) => {
      if (drag.current?.pointerId !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; }}>
    <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [1.5, 1.65, 3.2], fov: 46 }} gl={{ antialias: true }}>
      <color attach="background" args={["#152638"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 4, 5]} intensity={2.2} />
      <pointLight position={[-1.8, 2.6, -1.4]} color="#73b9da" intensity={1.3} distance={5} />
      <pointLight position={[1.8, 2.1, 1.5]} color="#f4c791" intensity={.65} distance={4} />
      <group position={[pose.x ?? 0, figureHeight, pose.y ?? 0]} rotation={[0, degrees(pose.yaw), 0]}>
        <group rotation={[degrees(pose.pitch), 0, degrees(pose.roll)]}>
          {figure.segments.map((segment, index) => <Segment key={index} {...segment} />)}
          {figure.joints.map((joint, index) => <Joint key={index} {...joint} />)}
          {furniture.dumbbells ? figure.joints.filter((joint) => joint.shape === "hand").map((joint, index) => <HandDumbbell key={index} joint={joint} size={furniture.dumbbellSize} color={furniture.dumbbellColor} />) : null}
        </group>
      </group>
      <SportRoom />
      <SportFurnitureScene furniture={furniture} />
      <EditorCamera controls={cameraControls} />
    </Canvas>
  </Base>;
}
