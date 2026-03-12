import React from 'react'
import { vi } from 'vitest'

const createMockMotionComponent = (element: string) => {
  return ({ children, ...props }: any) => {
    // Remove animation-specific props to avoid warnings
    const { 
      animate, 
      initial, 
      exit, 
      transition, 
      whileHover, 
      whileTap,
      variants,
      ...cleanProps 
    } = props;
    return React.createElement(element, cleanProps, children);
  };
};

export const motion = {
  div: createMockMotionComponent('div'),
  span: createMockMotionComponent('span'),
  button: createMockMotionComponent('button'),
  input: createMockMotionComponent('input'),
  form: createMockMotionComponent('form'),
  nav: createMockMotionComponent('nav'),
  header: createMockMotionComponent('header'),
  section: createMockMotionComponent('section'),
  article: createMockMotionComponent('article'),
  aside: createMockMotionComponent('aside'),
  main: createMockMotionComponent('main'),
  ul: createMockMotionComponent('ul'),
  li: createMockMotionComponent('li'),
  p: createMockMotionComponent('p'),
  h1: createMockMotionComponent('h1'),
  h2: createMockMotionComponent('h2'),
  h3: createMockMotionComponent('h3'),
};

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => 
  children ? React.createElement(React.Fragment, null, children) : null;

export const useInView = () => true;

export const useAnimation = () => ({ 
  start: vi.fn().mockResolvedValue(undefined), 
  stop: vi.fn(),
  set: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn()
});

export const useSpring = () => ({ 
  x: 0, 
  y: 0, 
  scale: 1, 
  opacity: 1,
  set: vi.fn(),
  get: vi.fn()
});

export const useTransform = (value: any, input: any, output: any) => output?.[0] || 0;

export const useMotionValue = (initialValue: any) => ({ 
  get: () => initialValue,
  set: vi.fn(),
  onChange: vi.fn(),
  destroy: vi.fn()
});

export const useScroll = () => ({ 
  scrollY: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
  scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() }
});

export const useMotionTemplate = () => '';

export const animate = vi.fn().mockResolvedValue(undefined);

export const useDragControls = () => ({ start: vi.fn(), stop: vi.fn() });

export const useMotionValueEvent = vi.fn();