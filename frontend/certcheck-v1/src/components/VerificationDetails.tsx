
import React from 'react';

interface VerificationDetailsProps {
  result: {
    model: string;
    detector_backend: string;
    distance: number;
    threshold: number;
    facial_areas: {
      img1: { x?: number; y?: number; w?: number; h?: number };
      img2: { x?: number; y?: number; w?: number; h?: number };
    };
  };
}

const VerificationDetails = ({ result }: VerificationDetailsProps) => {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-white font-medium mb-2">Verification Details</h3>
      <p className="text-gray-300 text-sm">
        <strong>Model:</strong> {result.model}<br />
        <strong>Detector Backend:</strong> {result.detector_backend}<br />
        <strong>Distance:</strong> {result.distance.toFixed(4)}<br />
        <strong>Threshold:</strong> {result.threshold}<br />
        <strong>Facial Areas (Captured Photo):</strong> x: {result.facial_areas.img1.x || 'N/A'}, 
        y: {result.facial_areas.img1.y || 'N/A'}, 
        w: {result.facial_areas.img1.w || 'N/A'}, 
        h: {result.facial_areas.img1.h || 'N/A'}<br />
        <strong>Facial Areas (Reference Photo):</strong> x: {result.facial_areas.img2.x || 'N/A'}, 
        y: {result.facial_areas.img2.y || 'N/A'}, 
        w: {result.facial_areas.img2.w || 'N/A'}, 
        h: {result.facial_areas.img2.h || 'N/A'}
      </p>
    </div>
  );
};

export default VerificationDetails;
