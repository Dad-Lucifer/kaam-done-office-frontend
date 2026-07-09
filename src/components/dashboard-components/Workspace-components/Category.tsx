import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Hash, Volume2, Rocket, Brain } from 'lucide-react';

interface CategoryProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateCategory?: () => void;
  onCreateTextChannel?: () => void;
  onCreateVoiceChannel?: () => void;
  onCreateTask?: () => void;
  onCreateAiHr?: () => void;
}

const Category: React.FC<CategoryProps> = ({ x, y, onClose, onCreateCategory, onCreateTextChannel, onCreateVoiceChannel, onCreateTask, onCreateAiHr }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed z-[1000] min-w-[180px] p-1.5 bg-[rgba(15,15,18,0.85)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col gap-0.5"
      style={{ top: y, left: x }}
      ref={menuRef}
    >
      <button 
        className="w-full flex items-center gap-2.5 px-3 py-2 text-text-secondary text-[13px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[rgba(124,58,237,0.15)] hover:text-white"
        onClick={onCreateCategory}
      >
        <FolderPlus size={16} />
        <span>Create Category</span>
      </button>
      
      <div className="w-full h-[1px] bg-[rgba(255,255,255,0.06)] my-0.5" />
      
      <button 
        className="w-full flex items-center gap-2.5 px-3 py-2 text-text-secondary text-[13px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[rgba(124,58,237,0.15)] hover:text-white"
        onClick={onCreateTextChannel}
      >
        <Hash size={16} />
        <span>Create Text Channel</span>
      </button>
      
      <button 
        className="w-full flex items-center gap-2.5 px-3 py-2 text-text-secondary text-[13px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[rgba(124,58,237,0.15)] hover:text-white"
        onClick={onCreateVoiceChannel}
      >
        <Volume2 size={16} />
        <span>Create Voice Channel</span>
      </button>

      <div className="w-full h-[1px] bg-[rgba(255,255,255,0.06)] my-0.5" />

      <button 
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer transition-all text-purple-300 hover:bg-[rgba(124,58,237,0.2)] hover:text-white"
        onClick={onCreateTask}
      >
        <Rocket size={16} className="text-purple-400" />
        <span>Create Task</span>
      </button>

      <div className="w-full h-[1px] bg-[rgba(255,255,255,0.06)] my-0.5" />

      <button 
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer transition-all text-purple-300 hover:bg-[rgba(124,58,237,0.2)] hover:text-white"
        onClick={onCreateAiHr}
      >
        <Brain size={16} className="text-purple-400" />
        <span>Create AI-HR Channel</span>
      </button>
    </motion.div>
  );
};

export default Category;
