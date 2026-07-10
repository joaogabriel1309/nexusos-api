update usuarios
set perfil = case
    when perfil = 'ADMIN' then 'ADMIN'
    else 'DESENVOLVEDOR'
end;
