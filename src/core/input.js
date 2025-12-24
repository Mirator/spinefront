export function createInputState() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    sprint: false,
    attack: false,
    interact: false,
  };
}

export function resetInputState(input) {
  Object.keys(input).forEach((key) => {
    input[key] = false;
  });
}
