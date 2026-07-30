import LanguageServices from "@/services/LanguageServices";
import TextTranslateServices from "@/services/TextTranslateServices";

const useTranslationValue = () => {
  // translate api call
  const handleTranslateCallApi = async (text, tnsForm, tnsTo) => {
    try {
      const res = await TextTranslateServices.translateText(
        text,
        tnsForm,
        tnsTo
      );

      return res?.responseData?.translatedText;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  // text translate handler
  const handlerTextTranslateHandler = async (text, tnsForm) => {
    const languages = await LanguageServices.getShowingLanguage();

    const filterLanguage = languages?.filter(
      (lan) => lan?.iso_code !== tnsForm
    );

    const promisesArray = filterLanguage.map((lan) => {
      return text
        ? handleTranslateCallApi(text?.toLowerCase(), tnsForm, lan?.iso_code)
        : "";
    });

    const results = await Promise.all(promisesArray);

    const languageArray = filterLanguage.map((lan, index) => {
      return {
        lang: lan?.iso_code,
        text: results[index],
      };
    });

    let objectTnsLanguage = languageArray.reduce(
      (obj, item) => Object.assign(obj, { [item.lang]: item.text }),
      {}
    );

    return objectTnsLanguage;
  };
  return {
    handlerTextTranslateHandler,
  };
};

export default useTranslationValue;
