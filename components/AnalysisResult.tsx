import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisResultProps {
  analysis: {
    missingRequirements: string[];
    improvements: string[];
  };
  coverLetter: string;
}

export const AnalysisResult = ({
  analysis,
  coverLetter,
}: AnalysisResultProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resume Improvement Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">
                Missing Requirements
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                {analysis.missingRequirements.map((requirement, index) => (
                  <li key={index} className="text-gray-700">
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">
                Suggested Improvements
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                {analysis.improvements.map((improvement, index) => (
                  <li key={index} className="text-gray-700">
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Cover Letter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-gray-700">{coverLetter}</div>
        </CardContent>
      </Card>
    </div>
  );
};
