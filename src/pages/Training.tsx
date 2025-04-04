import React from 'react';
import Navbar from '@/components/Navbar';
import AITraining from '@/components/AITraining';

const TrainingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <AITraining />
      </div>
    </div>
  );
};

export default TrainingPage;
