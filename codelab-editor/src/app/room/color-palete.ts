export type TUserColors = {
  0: '#3682db',
  1: '#8dda71',
  2: '#b8474e',
  3: '#ff8a00',
  4: '#7b439e',
  5: '#fcbb14',
  6: '#2fad96',
  7: '#314692',
  8: '#e7716a',
  9: '#959ba4'
}

export const UserColors: TUserColors = {
  0: '#3682db',
  1: '#8dda71',
  2: '#b8474e',
  3: '#ff8a00',
  4: '#7b439e',
  5: '#fcbb14',
  6: '#2fad96',
  7: '#314692',
  8: '#e7716a',
  9: '#959ba4'
}

export function getUserColor(): TUserColors[keyof TUserColors] {
  const id: keyof TUserColors = Math.round(Math.random()*10) as keyof TUserColors;

  return UserColors[id];
}
