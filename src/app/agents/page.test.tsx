import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentsPage from './page';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, placeholder, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      placeholder={placeholder} 
      {...props} 
    />
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select onChange={(e) => onValueChange(e.target.value)} value={value}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  )
}));

vi.mock('@/components/agents/agent-card', () => ({
  AgentCard: ({ agent, onDelete, onUpdate }: any) => (
    <div data-testid={`agent-card-${agent.id}`}>
      <h3>{agent.name}</h3>
      <p>{agent.role}</p>
      <p>{agent.status}</p>
      <button onClick={() => onDelete(agent.id)}>Delete</button>
      <button onClick={() => onUpdate(agent)}>Update</button>
    </div>
  )
}));

vi.mock('@/components/agents/create-agent-dialog', () => ({
  CreateAgentDialog: ({ open, onOpenChange, onAgentCreated }: any) => (
    <div style={{ display: open ? 'block' : 'none' }}>
      <div>Create Agent Dialog</div>
      <button onClick={() => onOpenChange(false)}>Close</button>
      <button 
        onClick={() => onAgentCreated({ id: 99, name: 'New Agent', role: 'coder', status: 'available' })}
      >
        Create
      </button>
    </div>
  )
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAgents = [
  {
    id: 1,
    name: 'Alice Coder',
    role: 'coder',
    status: 'available',
    color: '#3b82f6',
    avatarUrl: '',
    currentTaskId: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    taskCounts: { total: 5, active: 2 }
  },
  {
    id: 2,
    name: 'Bob Reviewer',
    role: 'reviewer',
    status: 'busy',
    color: '#8b5cf6',
    avatarUrl: '',
    currentTaskId: 123,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    taskCounts: { total: 8, active: 3 }
  }
];

describe('AgentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockAgents })
    });
  });

  it('should render the agents page with header', async () => {
    render(<AgentsPage />);
    
    expect(screen.getByText('Agent Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your development team and track agent workloads')).toBeInTheDocument();
    expect(screen.getByText('Add Agent')).toBeInTheDocument();
  });

  it('should fetch and display agents on mount', async () => {
    render(<AgentsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('agent-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-card-2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Alice Coder')).toBeInTheDocument();
    expect(screen.getByText('Bob Reviewer')).toBeInTheDocument();
  });

  it('should handle search input changes', async () => {
    render(<AgentsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search agents by name or role...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agents?search=Alice');
    });
  });

  it('should handle role filter changes', async () => {
    render(<AgentsPage />);
    
    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'coder' } });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agents?role=coder');
    });
  });

  it('should handle status filter changes', async () => {
    render(<AgentsPage />);
    
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'available' } });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agents?status=available');
    });
  });

  it('should open create agent dialog when add button is clicked', () => {
    render(<AgentsPage />);
    
    const addButton = screen.getByText('Add Agent');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Create Agent Dialog')).toBeInTheDocument();
  });

  it('should handle agent creation', async () => {
    const { toast } = await import('sonner');
    render(<AgentsPage />);
    
    const addButton = screen.getByText('Add Agent');
    fireEvent.click(addButton);
    
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);
    
    expect(toast.success).toHaveBeenCalledWith('Agent created successfully');
  });

  it('should display stats overview', async () => {
    render(<AgentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Busy')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Total Agents')).toBeInTheDocument();
    });
  });

  it('should handle fetch errors', async () => {
    const { toast } = await import('sonner');
    mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));
    
    render(<AgentsPage />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load agents');
    });
  });
});