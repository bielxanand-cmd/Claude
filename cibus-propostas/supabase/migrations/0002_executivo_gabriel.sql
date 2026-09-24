-- Executivo Gabriel Bettoni (para bancos criados antes deste seed)
insert into executives (id, name, email, phone, whatsapp, role, photo, active)
values ('exec-gabriel-bettoni', 'Gabriel Bettoni', '', '', '', 'Executivo de Contas', '', true)
on conflict (id) do nothing;
