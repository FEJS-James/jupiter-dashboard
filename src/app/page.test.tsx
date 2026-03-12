import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from './page'

describe('Home Page', () => {
  it('renders the Next.js logo', () => {
    render(<Home />)
    const logo = screen.getByAltText('Next.js logo')
    expect(logo).toBeInTheDocument()
  })

  it('displays the getting started heading', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { 
      name: /To get started, edit the page.tsx file/i 
    })
    expect(heading).toBeInTheDocument()
  })

  it('contains deploy and documentation links', () => {
    render(<Home />)
    const deployLink = screen.getByRole('link', { name: /deploy now/i })
    const docsLink = screen.getByRole('link', { name: /documentation/i })
    
    expect(deployLink).toBeInTheDocument()
    expect(docsLink).toBeInTheDocument()
    expect(deployLink).toHaveAttribute('href', expect.stringContaining('vercel.com'))
    expect(docsLink).toHaveAttribute('href', expect.stringContaining('nextjs.org'))
  })
})