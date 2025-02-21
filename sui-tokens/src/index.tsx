import { List, Icon, Color, Action, ActionPanel, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
// @ts-expect-error the library is not typed properly
import light_tokens from "@scaleaq/scaleui-tokens/light_tokens.js";
// @ts-expect-error the library is not typed properly
import dark_tokens from "@scaleaq/scaleui-tokens/dark_tokens.js";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const showPalette = getPreferenceValues().palette;

  const flattenedLightTokens = filterTokens(flattenThemeTokens(light_tokens), showPalette ? "" : "sui-palette");
  const flattenedDarkTokens = filterTokens(flattenThemeTokens(dark_tokens), showPalette ? "" : "sui-palette");

  const [darkTokensSearchList, searchDarkTokens] = useState(flattenedDarkTokens);
  const [lightTokensSearchList, searchLightTokens] = useState(flattenedLightTokens);

  const options = {
    includeScore: true,
    includeMatches: true,
    isCaseSensitive: false,
    findAllMatches: true,
    shouldSort: true,
    ignoreLocation: true,
    threshold: 0.2,
    keys: ["name", "value", "searchString"],
  };

  const fuseLight = new Fuse(flattenedLightTokens, options);
  const fuseDark = new Fuse(flattenedDarkTokens, options);

  useEffect(() => {
    if (searchText.length > 0) {
      const darkResults = fuseDark.search(searchText);
      const darkItems = darkResults.map((result) => result.item);
      searchDarkTokens(darkItems);

      const lightResults = fuseLight.search(searchText);
      const lightItems = lightResults.map((result) => result.item);
      searchLightTokens(lightItems);
    } else {
      searchDarkTokens(flattenedDarkTokens);
      searchLightTokens(flattenedLightTokens);
    }
  }, [searchText]);

  return (
    <List searchBarPlaceholder="Search SUI Tokens" filtering={false} onSearchTextChange={setSearchText}>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        title="No tokens found"
        description="Try searching for another token"
      />
      <List.Section title="Light Tokens">
        {lightTokensSearchList.map(({ name, value }) => (
          <TokenItem key={name} name={name} value={value} />
        ))}
      </List.Section>
      <List.Section title="Dark Tokens">
        {darkTokensSearchList.map(({ name, value }) => (
          <TokenItem key={name} name={name} value={value} />
        ))}
      </List.Section>
    </List>
  );
}

function TokenItem({ name, value }: { name: string; value: string }) {
  return (
    <List.Item
      key={name}
      title={name}
      subtitle={value}
      icon={{ source: Icon.Swatch, tintColor: value }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Token Name" content={name} />
          <Action.Paste title="Insert Token Name" content={name} />
          <Action.CopyToClipboard
            title="Copy Var()"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            content={`var(${name})`}
          />
          <Action.Paste
            title="Insert Var()"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            content={`var(${name})`}
          />
          <Action.CopyToClipboard title="Copy #hex" shortcut={{ modifiers: ["ctrl"], key: "enter" }} content={value} />
          <Action.Paste title="Insert #hex" shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }} content={value} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function flattenTokens(
  obj: Record<string, Record<string, string> | string>,
  prefix = "",
): { name: string; value: string }[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const newKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === "object") {
      return flattenTokens(value, newKey);
    }
    return [{ name: `--${newKey}`, value }];
  });
}

function flattenThemeTokens(
  obj: Record<string, unknown>,
  prefix = "",
): { name: string; value: string; searchString?: string }[] {
  const result: { name: string; value: string; searchString?: string }[] = [];
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !isStringValue(obj[key])) {
      result.push(...flattenTokens(obj[key] as Record<string, string>, newKey));
    } else {
      result.push({ name: `--${newKey}`, value: String(obj[key]), searchString: newKey.split("-").join(" ") });
      console.log(newKey.split("-").join(" "));
    }
  }
  return result;
}

function isStringValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("#");
}

function filterTokens(tokens: { name: string; value: string }[], exclude: string) {
  if (!exclude) return tokens;
  return tokens.filter((item) => !item.name.includes(exclude)).sort((a, b) => a.name.localeCompare(b.name));
}
