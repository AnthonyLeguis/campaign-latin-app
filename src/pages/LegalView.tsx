import { useNavigation } from "../context/NavigationContext";

export const LegalView = () => {
  const { navigate } = useNavigation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-2">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-6">
          Terms and Privacy Notice
        </h2>

        <div className="text-gray-900 text-sm leading-relaxed space-y-4">
          <p>
            By using this website, you acknowledge and accept the terms that
            govern access, navigation, and use of our services.
          </p>
          <p>
            All materials available on this site, including text, graphics,
            images, videos, and brand elements, belong to Latin Group Insurance
            and are protected by applicable intellectual property laws.
            Reproduction, redistribution, or unauthorized use is prohibited
            without prior written consent.
          </p>
          <p>
            Any misuse of this website, its content, or its systems may lead to
            legal action where permitted by law.
          </p>
          <p>
            We may update these terms and privacy-related disclosures at any
            time to reflect legal, operational, or service changes. Continued
            use of this site after updates constitutes acceptance of those
            changes.
          </p>
          <p>
            If you submit your information, you consent to be contacted by a
            licensed agent by phone, text message, or email regarding relevant
            insurance options.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("view1")}
            className="bg-[#084f63] text-white py-2 px-6 rounded-md text-sm font-bold hover:bg-[#0a5f77] transition-colors cursor-pointer"
          >
            Back to Main Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalView;
