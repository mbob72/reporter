import { Button, Card, Container, Select, Stack, Text, Title } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { MockUserId } from '@report-platform/auth';

import { useAppDispatch } from '../../../app/hooks';
import { buildLauncherUsers } from '../lib/launcherUsers';
import { selectMockUser } from '../store/sessionSlice';

export function LoginContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const users = useMemo(() => buildLauncherUsers(), []);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100/90 p-2 sm:p-4 lg:p-8">
      <Container size="sm" className="h-full py-0">
        <Card withBorder radius="lg" p="lg" className="mx-auto mt-16 bg-white/80">
          <Stack gap="md">
            <div>
              <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                Reporting Runtime
              </Text>
              <Title order={2}>Login</Title>
              <Text c="dimmed" size="sm" mt={6}>
                Select a user to start session.
              </Text>
            </div>

            <Select
              label="Mock user"
              placeholder="Select user"
              value={selectedUserId}
              data={[
                { value: '', label: '— Select user —' },
                ...users.map((user) => ({
                  value: user.id,
                  label: `${user.name} (${user.role})`,
                })),
              ]}
              onChange={(nextValue) => {
                setSelectedUserId(nextValue ?? '');
              }}
            />

            <Button
              disabled={selectedUserId.trim().length === 0}
              onClick={() => {
                if (selectedUserId.trim().length === 0) {
                  return;
                }

                dispatch(selectMockUser(selectedUserId as MockUserId));
                navigate('/report-launch', { replace: true });
              }}
            >
              Login
            </Button>
          </Stack>
        </Card>
      </Container>
    </div>
  );
}
