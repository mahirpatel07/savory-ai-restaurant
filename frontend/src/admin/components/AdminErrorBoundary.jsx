import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[28px] border border-red-500/20 bg-red-950/10 backdrop-blur-2xl my-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Something went wrong loading this view
          </h2>
          <p className="text-xs sm:text-sm text-white/60 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh or try again.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
