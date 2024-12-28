import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JobUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

export const JobUrlInput = ({
  value,
  onChange,
  isDisabled,
}: JobUrlInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="jobUrl">
        Job Post URL, make sure is a direct link to the job post or paste the
        job posting below
      </Label>
      <Input
        id="jobUrl"
        type="url"
        placeholder="https://example.com/job-posting"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
      />
    </div>
  );
};
