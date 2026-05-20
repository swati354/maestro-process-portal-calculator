import { useAuth } from '@/hooks/useAuth';
import { LoginScreen } from '@/components/LoginScreen';
import { HomePage } from '@/pages/HomePage';

export function App() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    <span className="text-muted-foreground font-medium">Initializing UiPath SDK...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    return <HomePage />;
}
