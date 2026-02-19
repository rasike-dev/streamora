import {getRequestConfig} from "next-intl/server";
import {notFound} from "next/navigation";

export default getRequestConfig(async ({locale}) => {
  // Validate locale
  if (!locale || !["en", "si", "ta"].includes(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
