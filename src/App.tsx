import { useState } from 'react';
import { PracticePage } from './pages/PracticePage';
import { ReviewPage } from './pages/ReviewPage';
import { StartPage } from './pages/StartPage';

export type Route = 'start' | 'practice' | 'review';

export function App() {
  const [route, setRoute] = useState<Route>('start');

  if (route === 'practice') {
    return <PracticePage onBack={() => setRoute('start')} />;
  }

  if (route === 'review') {
    return <ReviewPage onBack={() => setRoute('start')} />;
  }

  return (
    <StartPage
      onPractice={() => setRoute('practice')}
      onReview={() => setRoute('review')}
    />
  );
}
