'use client'

// Touch interaction utilities for mobile gestures

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
}

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export class TouchGestureHandler {
  private startPoint: TouchPoint | null = null
  private endPoint: TouchPoint | null = null
  private element: HTMLElement
  private callbacks: {
    onSwipe?: (direction: SwipeDirection) => void
    onLongPress?: (point: TouchPoint) => void
    onTap?: (point: TouchPoint) => void
    onPinch?: (scale: number) => void
  } = {}

  private longPressTimer: NodeJS.Timeout | null = null
  private longPressThreshold = 500 // ms
  private swipeThreshold = 50 // px
  private tapThreshold = 10 // px
  private velocityThreshold = 0.1 // px/ms

  constructor(element: HTMLElement) {
    this.element = element
    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this))
  }

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.startPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        timestamp: Date.now()
      }

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        if (this.startPoint && this.callbacks.onLongPress) {
          this.callbacks.onLongPress(this.startPoint)
        }
      }, this.longPressThreshold)
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 1 && this.startPoint) {
      const currentPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        timestamp: Date.now()
      }

      const distance = Math.sqrt(
        Math.pow(currentPoint.x - this.startPoint.x, 2) +
        Math.pow(currentPoint.y - this.startPoint.y, 2)
      )

      // Cancel long press if moved too much
      if (distance > this.tapThreshold && this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }

    if (event.changedTouches.length === 1 && this.startPoint) {
      this.endPoint = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
        timestamp: Date.now()
      }

      this.processGesture()
    }
  }

  private handleTouchCancel() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    this.startPoint = null
    this.endPoint = null
  }

  private processGesture() {
    if (!this.startPoint || !this.endPoint) return

    const deltaX = this.endPoint.x - this.startPoint.x
    const deltaY = this.endPoint.y - this.startPoint.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = this.endPoint.timestamp - this.startPoint.timestamp
    const velocity = distance / duration

    // Check for swipe
    if (distance > this.swipeThreshold && velocity > this.velocityThreshold) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      let direction: SwipeDirection['direction']
      
      if (absDeltaX > absDeltaY) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      if (this.callbacks.onSwipe) {
        this.callbacks.onSwipe({
          direction,
          distance,
          velocity
        })
      }
    } else if (distance < this.tapThreshold && this.callbacks.onTap) {
      // Check for tap
      this.callbacks.onTap(this.startPoint)
    }

    // Reset
    this.startPoint = null
    this.endPoint = null
  }

  public onSwipe(callback: (direction: SwipeDirection) => void) {
    this.callbacks.onSwipe = callback
    return this
  }

  public onLongPress(callback: (point: TouchPoint) => void) {
    this.callbacks.onLongPress = callback
    return this
  }

  public onTap(callback: (point: TouchPoint) => void) {
    this.callbacks.onTap = callback
    return this
  }

  public onPinch(callback: (scale: number) => void) {
    this.callbacks.onPinch = callback
    return this
  }

  public destroy() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
    }
    
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
  }
}

import React from 'react'

// Hook for using touch gestures in React components
export function useTouchGestures(
  ref: React.RefObject<HTMLElement>,
  callbacks: {
    onSwipe?: (direction: SwipeDirection) => void
    onLongPress?: (point: TouchPoint) => void
    onTap?: (point: TouchPoint) => void
    onPinch?: (scale: number) => void
  }
) {
  React.useEffect(() => {
    if (!ref.current) return

    const handler = new TouchGestureHandler(ref.current)
    
    if (callbacks.onSwipe) handler.onSwipe(callbacks.onSwipe)
    if (callbacks.onLongPress) handler.onLongPress(callbacks.onLongPress)
    if (callbacks.onTap) handler.onTap(callbacks.onTap)
    if (callbacks.onPinch) handler.onPinch(callbacks.onPinch)

    return () => handler.destroy()
  }, [ref, callbacks])
}

// Utility functions for touch feedback
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20)
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30])
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }
}

// Prevent zoom on double tap for specific elements
export function preventZoom(element: HTMLElement) {
  element.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  })
  
  element.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  })
}