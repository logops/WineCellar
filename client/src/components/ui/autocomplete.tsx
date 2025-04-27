import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange: (value: string) => void;
  value: string;
}

export function Autocomplete({
  suggestions,
  className,
  onValueChange,
  value,
  ...props
}: AutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;
    setInputValue(userInput);
    onValueChange(userInput);

    // Filter our suggestions
    const unLinked = suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );

    setFilteredSuggestions(unLinked);
    setShowSuggestions(true);
    setActiveSuggestionIndex(0);
  };

  const onClick = (suggestion: string) => {
    setInputValue(suggestion);
    onValueChange(suggestion);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // User pressed the enter key
    if (e.key === "Enter") {
      e.preventDefault();
      if (
        activeSuggestionIndex >= 0 &&
        activeSuggestionIndex < filteredSuggestions.length
      ) {
        setInputValue(filteredSuggestions[activeSuggestionIndex]);
        onValueChange(filteredSuggestions[activeSuggestionIndex]);
        setShowSuggestions(false);
      }
    }
    // User pressed the up arrow
    else if (e.key === "ArrowUp") {
      if (activeSuggestionIndex === 0) {
        return;
      }
      setActiveSuggestionIndex(activeSuggestionIndex - 1);
    }
    // User pressed the down arrow
    else if (e.key === "ArrowDown") {
      if (activeSuggestionIndex === filteredSuggestions.length - 1) {
        return;
      }
      setActiveSuggestionIndex(activeSuggestionIndex + 1);
    }
    // User pressed the escape key
    else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (inputValue && suggestions.length > 0) {
            setShowSuggestions(true);
            setFilteredSuggestions(
              suggestions.filter(
                (suggestion) =>
                  suggestion.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
              )
            );
          }
        }}
        className={cn(className)}
        {...props}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => onClick(suggestion)}
              className={cn(
                "px-4 py-2 text-sm cursor-pointer hover:bg-gray-100",
                index === activeSuggestionIndex && "bg-cream-100"
              )}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}