import { clamp } from '../systems/math.js';

const anchorToGround = (world, height) => clamp(world.height - height, 0, Math.max(0, world.height - height));

export function createCamera(viewWidth, viewHeight, world) {
  return {
    x: 0,
    y: anchorToGround(world, viewHeight),
    w: viewWidth,
    h: viewHeight,
  };
}

export function resizeCamera(camera, viewWidth, viewHeight, world) {
  camera.w = viewWidth;
  camera.h = viewHeight;
  camera.x = clamp(camera.x, 0, Math.max(0, world.width - camera.w));
  camera.y = anchorToGround(world, camera.h);
}

export function updateCamera(camera, player, world) {
  const third = camera.w / 3;
  const playerCenterX = player.x + player.w / 2;
  const leftBound = camera.x + third;
  const rightBound = camera.x + 2 * third;

  if (playerCenterX < leftBound) {
    camera.x = playerCenterX - third;
  } else if (playerCenterX > rightBound) {
    camera.x = playerCenterX - 2 * third;
  }

  camera.x = clamp(camera.x, 0, Math.max(0, world.width - camera.w));
  camera.y = anchorToGround(world, camera.h);
}
