interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="flex items-center gap-4 mb-8">
      {/* Progress bar */}
      <div className="flex-1 h-[8px] bg-[#E5E5EA] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0000FF] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      <span className="text-[18px] font-semibold text-[#161616] whitespace-nowrap flex-shrink-0">
        Paso {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
