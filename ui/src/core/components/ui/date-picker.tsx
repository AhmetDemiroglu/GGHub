'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/core/lib/utils';
import { Button } from '@/core/components/ui/button';
import { Calendar } from '@/core/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/ui/popover';

interface DatePickerProps {
  date: Date | null | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP', { locale: tr }) : <span>Doğum tarihi seçin</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={onDateChange}
            className="rounded-md border shadow-sm"
            captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}