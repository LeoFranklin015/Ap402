"use client";

import React from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import VideoPlayer from '@/components/VideoPlayer';

const VideoPage = () => {

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              See It In Action
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Watch how Aptos402 transforms any endpoint into a payment-accepting service in just 3 lines of code
            </p>
          </div>

          {/* Video Player Container */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 p-8">
              <VideoPlayer />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default VideoPage;
