import {describe, expect, it, vi} from 'vitest';
import {preventPageSave} from './prevent-page-save';

describe('preventPageSave', () => {
  it.each([
    {ctrlKey: true, key: 's', code: 'KeyS'},
    {metaKey: true, key: 's', code: 'KeyS'},
    {ctrlKey: true, key: 'ы', code: 'KeyS'},
    {ctrlKey: true, key: 'S', code: ''},
  ])('blocks the save shortcut: %j', shortcut => {
    const event = {ctrlKey: false, metaKey: false, altKey: false, ...shortcut, preventDefault: vi.fn()};
    preventPageSave(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it.each([
    {key: 's', code: 'KeyS'},
    {ctrlKey: true, key: 'c', code: 'KeyC'},
    {ctrlKey: true, altKey: true, key: 's', code: 'KeyS'},
  ])('preserves typing and unrelated shortcuts: %j', shortcut => {
    const event = {ctrlKey: false, metaKey: false, altKey: false, ...shortcut, preventDefault: vi.fn()};
    preventPageSave(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
