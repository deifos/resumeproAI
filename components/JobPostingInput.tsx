import React from "react";
import { Textarea } from "@/components/ui/textarea"; // Adjust the import based on your project structure

interface JobPostingInputProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled: boolean;
}

const JobPostingInput: React.FC<JobPostingInputProps> = ({
  value,
  onChange,
  isDisabled,
}) => {
  return (
    <div>
      <label htmlFor="jobPosting">Paste Job Posting:</label>
      <Textarea
        id="jobPosting"
        name="jobPosting"
        rows={5}
        cols={40}
        placeholder="Paste the job posting here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
      />
    </div>
  );
};

export default JobPostingInput;
