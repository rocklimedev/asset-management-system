// @ts-check
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../services/context/AuthContext';
import { ConfirmProvider } from '../components/ui/confirm-dialog';
import { Toaster } from '../components/ui/toast';
import { PwaPrompts } from '../components/pwa/PwaPrompts';
import AppRoutes from './Routes';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <AppRoutes />
          <Toaster />
        </ConfirmProvider>
        <PwaPrompts />
      </AuthProvider>
    </BrowserRouter>
  );
}
